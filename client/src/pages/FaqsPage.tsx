import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Edit, Trash2, GripVertical, X } from 'lucide-react';
import { getFaqs, createFaq, updateFaq, deleteFaq, reorderFaqs } from '../services/api';
import type { FAQ } from '../types';

interface SortableItemProps {
  id: number;
  faq: FAQ;
  onEdit: (faq: FAQ) => void;
  onDelete: (id: number) => void;
}

function SortableFaqItem({ id, faq, onEdit, onDelete }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-[var(--card)] p-4 rounded-xl border border-[var(--border)] shadow-[var(--shadow-sm)] mb-3 ${
        isDragging ? 'shadow-lg z-10' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 p-1 text-[var(--text-muted)] hover:text-[var(--text)] cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="font-medium text-[var(--text)]">{faq.question}</div>
          <div className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">{faq.answer}</div>
          <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 capitalize">
            {faq.category}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(faq)}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-150 cursor-pointer"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(faq.id)}
            className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-150 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function FaqsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [formData, setFormData] = useState({ question: '', answer: '', category: '' });
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadFaqs = async () => {
    try {
      setLoading(true);
      const response = await getFaqs();
      setFaqs(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaqs();
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = faqs.findIndex((f) => f.id === active.id);
      const newIndex = faqs.findIndex((f) => f.id === over.id);

      const newOrder = arrayMove(faqs, oldIndex, newIndex);
      setFaqs(newOrder);

      try {
        await reorderFaqs(newOrder.map((f) => f.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reorder FAQs');
        loadFaqs();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingFaq) {
        await updateFaq(editingFaq.id, formData);
      } else {
        await createFaq(formData);
      }
      setShowModal(false);
      setEditingFaq(null);
      setFormData({ question: '', answer: '', category: '' });
      loadFaqs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save FAQ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;
    try {
      await deleteFaq(id);
      loadFaqs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete FAQ');
    }
  };

  const openEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
    });
    setShowModal(true);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
            FAQs
          </h1>
          <p className="text-[var(--text-muted)] mt-1">Manage frequently asked questions</p>
        </div>
        <button
          onClick={() => {
            setEditingFaq(null);
            setFormData({ question: '', answer: '', category: '' });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors duration-200"
        >
          <Plus className="w-5 h-5" />
          Add FAQ
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 mb-6">
          {error}
        </div>
      )}

      {/* Reorder hint */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-700 dark:text-blue-400">
          <strong>Tip:</strong> Drag and drop to reorder FAQs. The order is saved automatically.
        </p>
      </div>

      {/* FAQ List */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
          </div>
        ) : faqs.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)]">
            No FAQs found. Add your first FAQ to get started.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={faqs.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              {faqs.map((faq) => (
                <SortableFaqItem
                  key={faq.id}
                  id={faq.id}
                  faq={faq}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card)] rounded-2xl w-full max-w-xl">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
              <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                {editingFaq ? 'Edit FAQ' : 'New FAQ'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-[var(--surface)] rounded-lg transition-colors duration-150 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Question</label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Answer</label>
                <textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="">Select category</option>
                  <option value="general">General</option>
                  <option value="treatment">Treatment</option>
                  <option value="costs">Costs</option>
                  <option value="process">Process</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 border border-[var(--border)] rounded-lg hover:bg-[var(--surface)] transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors duration-200 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingFaq ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
