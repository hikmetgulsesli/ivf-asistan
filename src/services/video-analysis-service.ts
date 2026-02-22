import { Pool } from 'pg';
import { getKimiVideoAnalysisService } from './kimi-video-analysis-service.js';
import { generateEmbedding } from './embedding-service.js';

// Simple in-memory queue for video analysis jobs
const analysisQueue: Array<{ videoId: number; attempt: number }> = [];
let isProcessing = false;

export interface VideoAnalysisJob {
  videoId: number;
  attempt: number;
}

/**
 * Queue a video for analysis
 */
export function queueVideoAnalysis(videoId: number): void {
  // Check if already queued
  const existingIndex = analysisQueue.findIndex(job => job.videoId === videoId);
  if (existingIndex === -1) {
    analysisQueue.push({ videoId, attempt: 0 });
    console.log(`[VideoAnalysisQueue] Video ${videoId} queued for analysis`);
  }
  
  // Start processing if not already running
  if (!isProcessing) {
    processQueue();
  }
}

/**
 * Process the analysis queue
 */
async function processQueue(): Promise<void> {
  if (isProcessing || analysisQueue.length === 0) {
    return;
  }
  
  isProcessing = true;
  
  while (analysisQueue.length > 0) {
    const job = analysisQueue.shift();
    if (!job) continue;
    
    await processVideoAnalysis(job);
  }
  
  isProcessing = false;
}

/**
 * Process a single video analysis job
 */
async function processVideoAnalysis(job: VideoAnalysisJob): Promise<void> {
  const pool = getPool();
  const { videoId, attempt } = job;
  const maxRetries = 3;
  
  try {
    // Update status to processing
    await pool.query(
      "UPDATE videos SET analysis_status = 'processing', error_message = NULL WHERE id = $1",
      [videoId]
    );
    
    // Get video details
    const result = await pool.query('SELECT * FROM videos WHERE id = $1', [videoId]);
    const video = result.rows[0];
    
    if (!video) {
      console.error(`[VideoAnalysis] Video ${videoId} not found`);
      return;
    }
    
    console.log(`[VideoAnalysis] Starting analysis for video ${videoId}: ${video.title}`);
    const startTime = Date.now();
    
    // Call Kimi for analysis
    const kimiService = getKimiVideoAnalysisService();
    const analysisResult = await kimiService.analyzeVideo(video.url, video.title);
    
    const durationMs = Date.now() - startTime;
    console.log(`[VideoAnalysis] Analysis completed in ${durationMs}ms for video ${videoId}`);
    
    // Generate embedding from summary
    let embedding: number[] | null = null;
    if (analysisResult.summary) {
      const searchText = `${video.title} ${analysisResult.summary} ${analysisResult.key_topics?.join(' ') || ''} ${video.category}`;
      const embeddingResult = await generateEmbedding(searchText);
      embedding = embeddingResult.embedding;
    }
    
    // Update video with analysis results
    await pool.query(
      `UPDATE videos 
       SET summary = $1, 
           key_topics = $2, 
           timestamps = $3, 
           analysis_status = 'done',
           error_message = NULL,
           embedding = $4
       WHERE id = $5`,
      [
        analysisResult.summary,
        JSON.stringify(analysisResult.key_topics || []),
        JSON.stringify(analysisResult.timestamps || []),
        embedding ? JSON.stringify(embedding) : null,
        videoId,
      ]
    );
    
    console.log(`[VideoAnalysis] Video ${videoId} updated with analysis results`);
    
  } catch (error) {
    console.error(`[VideoAnalysis] Error analyzing video ${videoId}:`, error);
    
    // Retry if attempts remain
    if (attempt < maxRetries) {
      console.log(`[VideoAnalysis] Retrying video ${videoId} (attempt ${attempt + 1}/${maxRetries})`);
      analysisQueue.push({ videoId, attempt: attempt + 1 });
    } else {
      // Mark as failed
      await pool.query(
        "UPDATE videos SET analysis_status = 'failed', error_message = $1 WHERE id = $2",
        [error instanceof Error ? error.message : 'Unknown error', videoId]
      );
      console.error(`[VideoAnalysis] Video ${videoId} failed after ${maxRetries} attempts`);
    }
  }
}

let pool: Pool | null = null;

export function setPool(p: Pool) {
  pool = pool || p;
}

export function initVideoAnalysisService(p: Pool) {
  pool = p;
}

function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  return pool;
}

/**
 * Get current queue status
 */
export function getQueueStatus(): { queued: number; isProcessing: boolean } {
  return {
    queued: analysisQueue.length,
    isProcessing,
  };
}

/**
 * Manually trigger analysis for a video (for testing or retry)
 */
export async function triggerVideoAnalysis(videoId: number): Promise<void> {
  queueVideoAnalysis(videoId);
}
