import { useState } from 'react';
import { BookOpen, Copy, Check, Terminal, Globe, Code2, Gauge, Shield } from 'lucide-react';

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-[#1e1e1e] text-gray-100 p-4 rounded-lg text-sm overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Kopyala"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

function Section({ id, icon: Icon, title, children }: { id: string; icon: any; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="bg-[var(--card)] p-6 rounded-xl border border-[var(--border)] shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-5 h-5 text-[var(--primary)]" />
        <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

// Embed code snippets stored as constants (these are documentation examples for users to copy)
function getWordPressSnippet(baseUrl: string) {
  return `// functions.php
function ivf_chat_widget_shortcode() {
  $api_url = "${baseUrl}/api/chat";
  ob_start();
  ?>
  <div id="ivf-chat-widget"></div>
  <script>
  (function() {
    var API = "<?php echo esc_url($api_url); ?>";
    var sessionId = "wp-" + (localStorage.getItem("ivf_sid") || (function() {
      var id = Math.random().toString(36).slice(2);
      localStorage.setItem("ivf_sid", id);
      return id;
    })());

    var container = document.getElementById("ivf-chat-widget");
    // Widget DOM oluşturma
    var wrapper = document.createElement("div");
    wrapper.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:9999";

    var chatBox = document.createElement("div");
    chatBox.id = "ivf-chat-box";
    chatBox.style.cssText = "display:none;width:380px;height:520px;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.15);background:#fff;flex-direction:column;overflow:hidden";

    var header = document.createElement("div");
    header.style.cssText = "background:#059669;color:#fff;padding:16px;font-weight:600";
    header.textContent = "IVF Asistan";

    var msgArea = document.createElement("div");
    msgArea.id = "ivf-messages";
    msgArea.style.cssText = "flex:1;overflow-y:auto;padding:12px";

    var inputArea = document.createElement("div");
    inputArea.style.cssText = "padding:12px;border-top:1px solid #e5e5e5;display:flex;gap:8px";

    var input = document.createElement("input");
    input.id = "ivf-input";
    input.placeholder = "Sorunuzu yazin...";
    input.style.cssText = "flex:1;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;outline:none";

    var sendBtn = document.createElement("button");
    sendBtn.textContent = "Gonder";
    sendBtn.style.cssText = "padding:8px 16px;background:#059669;color:#fff;border:none;border-radius:8px;cursor:pointer";

    inputArea.appendChild(input);
    inputArea.appendChild(sendBtn);
    chatBox.appendChild(header);
    chatBox.appendChild(msgArea);
    chatBox.appendChild(inputArea);

    var fab = document.createElement("button");
    fab.textContent = "\\uD83D\\uDCAC";
    fab.style.cssText = "width:56px;height:56px;border-radius:50%;background:#059669;color:#fff;border:none;cursor:pointer;font-size:24px;box-shadow:0 4px 12px rgba(0,0,0,.2)";

    wrapper.appendChild(chatBox);
    wrapper.appendChild(fab);
    container.appendChild(wrapper);

    fab.onclick = function() {
      chatBox.style.display = chatBox.style.display === "flex" ? "none" : "flex";
    };

    function addMsg(role, text) {
      var div = document.createElement("div");
      div.style.cssText = "margin:8px 0;padding:10px 14px;border-radius:12px;max-width:85%;font-size:14px;" +
        (role === "user"
          ? "background:#059669;color:#fff;margin-left:auto;border-bottom-right-radius:4px"
          : "background:#f3f4f6;color:#1f2937;border-bottom-left-radius:4px");
      div.textContent = text;
      msgArea.appendChild(div);
      msgArea.scrollTop = msgArea.scrollHeight;
    }

    function sendMessage() {
      var msg = input.value.trim();
      if (!msg) return;
      addMsg("user", msg);
      input.value = "";
      fetch(API, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({message: msg, session_id: sessionId})
      }).then(function(r) { return r.json(); })
        .then(function(d) { addMsg("assistant", d.data.answer); })
        .catch(function() { addMsg("assistant", "Bir hata olustu."); });
    }

    sendBtn.onclick = sendMessage;
    input.onkeydown = function(e) { if (e.key === "Enter") sendMessage(); };
  })();
  </script>
  <?php
  return ob_get_clean();
}
add_shortcode('ivf_chat', 'ivf_chat_widget_shortcode');`;
}

function getEmbedSnippet(baseUrl: string) {
  return `<script>
(function() {
  var API = "${baseUrl}/api/chat";
  var sid = "embed-" + (sessionStorage.getItem("ivf_sid") || (function() {
    var id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    sessionStorage.setItem("ivf_sid", id);
    return id;
  })());

  // Widget DOM olusturma (createElement ile)
  var wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:9999";

  var box = document.createElement("div");
  box.style.cssText = "display:none;width:380px;height:520px;border-radius:16px;" +
    "box-shadow:0 8px 32px rgba(0,0,0,.15);background:#fff;flex-direction:column;overflow:hidden";

  var hdr = document.createElement("div");
  hdr.style.cssText = "background:#059669;color:#fff;padding:16px;font-weight:600";
  hdr.textContent = "IVF Asistan";

  var msgs = document.createElement("div");
  msgs.style.cssText = "flex:1;overflow-y:auto;padding:12px";

  var bar = document.createElement("div");
  bar.style.cssText = "padding:12px;border-top:1px solid #e5e5e5;display:flex;gap:8px";

  var inp = document.createElement("input");
  inp.placeholder = "Sorunuzu yazin...";
  inp.style.cssText = "flex:1;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;outline:none";

  var btn = document.createElement("button");
  btn.textContent = "Gonder";
  btn.style.cssText = "padding:8px 16px;background:#059669;color:#fff;border:none;border-radius:8px;cursor:pointer";

  bar.appendChild(inp);
  bar.appendChild(btn);
  box.appendChild(hdr);
  box.appendChild(msgs);
  box.appendChild(bar);

  var fab = document.createElement("button");
  fab.textContent = "\\uD83D\\uDCAC";
  fab.style.cssText = "width:56px;height:56px;border-radius:50%;background:#059669;color:#fff;" +
    "border:none;cursor:pointer;font-size:24px;box-shadow:0 4px 12px rgba(0,0,0,.2)";

  wrapper.appendChild(box);
  wrapper.appendChild(fab);
  document.body.appendChild(wrapper);

  fab.onclick = function() {
    box.style.display = box.style.display === "flex" ? "none" : "flex";
  };

  function add(role, text) {
    var d = document.createElement("div");
    d.style.cssText = "margin:8px 0;padding:10px 14px;border-radius:12px;max-width:85%;font-size:14px;" +
      (role === "user"
        ? "background:#059669;color:#fff;margin-left:auto;border-bottom-right-radius:4px"
        : "background:#f3f4f6;color:#1f2937;border-bottom-left-radius:4px");
    d.textContent = text;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function send() {
    var m = inp.value.trim();
    if (!m) return;
    add("user", m);
    inp.value = "";
    fetch(API, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({message: m, session_id: sid})
    }).then(function(r) { return r.json(); })
      .then(function(d) { add("assistant", d.data.answer); })
      .catch(function() { add("assistant", "Bir hata olustu."); });
  }

  btn.onclick = send;
  inp.onkeydown = function(e) { if (e.key === "Enter") send(); };
})();
</script>`;
}

export function ApiDocsPage() {
  const baseUrl = window.location.origin;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
          API Docs
        </h1>
        <p className="text-[var(--text-muted)] mt-1">Chat API entegrasyon rehberi</p>
      </div>

      <div className="space-y-6">

        {/* Chat Endpoint */}
        <Section id="chat" icon={Terminal} title="POST /api/chat">
          <p className="text-sm text-[var(--text-muted)] mb-4">Kullanıcı mesajı gönderir, IVF asistan yanıtı alır.</p>

          <h3 className="text-sm font-semibold text-[var(--text)] mb-2">Request Body</h3>
          <div className="mb-4 text-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="py-2 pr-4 text-[var(--text-muted)] font-medium">Param</th>
                  <th className="py-2 pr-4 text-[var(--text-muted)] font-medium">Tip</th>
                  <th className="py-2 pr-4 text-[var(--text-muted)] font-medium">Zorunlu</th>
                  <th className="py-2 text-[var(--text-muted)] font-medium">Açıklama</th>
                </tr>
              </thead>
              <tbody className="text-[var(--text)]">
                <tr className="border-b border-[var(--border)]">
                  <td className="py-2 pr-4"><code className="text-xs bg-[var(--surface)] px-1.5 py-0.5 rounded">message</code></td>
                  <td className="py-2 pr-4">string</td>
                  <td className="py-2 pr-4">Evet</td>
                  <td className="py-2">Kullanıcı mesajı (max 2000 karakter)</td>
                </tr>
                <tr className="border-b border-[var(--border)]">
                  <td className="py-2 pr-4"><code className="text-xs bg-[var(--surface)] px-1.5 py-0.5 rounded">session_id</code></td>
                  <td className="py-2 pr-4">string</td>
                  <td className="py-2 pr-4">Evet</td>
                  <td className="py-2">Konuşma oturumu kimliği</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4"><code className="text-xs bg-[var(--surface)] px-1.5 py-0.5 rounded">stage</code></td>
                  <td className="py-2 pr-4">string</td>
                  <td className="py-2 pr-4">Hayır</td>
                  <td className="py-2">Tedavi aşaması (ör: stimulation, egg_retrieval, tww)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-sm font-semibold text-[var(--text)] mb-2">cURL</h3>
          <CodeBlock code={`curl -X POST ${baseUrl}/api/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "IVF tedavisi nedir?",
    "session_id": "user-123",
    "stage": "initial_consultation"
  }'`} />

          <h3 className="text-sm font-semibold text-[var(--text)] mt-4 mb-2">JavaScript (fetch)</h3>
          <CodeBlock code={`const response = await fetch("${baseUrl}/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "IVF tedavisi nedir?",
    session_id: "user-123",
    stage: "initial_consultation"
  })
});
const { data } = await response.json();
console.log(data.answer);
console.log(data.sources);
console.log(data.sentiment); // positive, negative, anxious, neutral
console.log(data.isEmergency); // true/false`} />

          <h3 className="text-sm font-semibold text-[var(--text)] mt-4 mb-2">Response</h3>
          <CodeBlock code={`{
  "data": {
    "answer": "IVF (In Vitro Fertilizasyon)...",
    "sources": [
      {
        "type": "article",
        "id": 1,
        "title": "IVF Nedir?",
        "category": "treatment"
      }
    ],
    "sentiment": "neutral",
    "isEmergency": false,
    "emergencyMessage": null
  }
}`} />
        </Section>

        {/* History Endpoint */}
        <Section id="history" icon={BookOpen} title="GET /api/chat/history">
          <p className="text-sm text-[var(--text-muted)] mb-4">Bir session'ın konuşma geçmişini getirir.</p>

          <div className="mb-4 text-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="py-2 pr-4 text-[var(--text-muted)] font-medium">Query Param</th>
                  <th className="py-2 pr-4 text-[var(--text-muted)] font-medium">Tip</th>
                  <th className="py-2 text-[var(--text-muted)] font-medium">Açıklama</th>
                </tr>
              </thead>
              <tbody className="text-[var(--text)]">
                <tr className="border-b border-[var(--border)]">
                  <td className="py-2 pr-4"><code className="text-xs bg-[var(--surface)] px-1.5 py-0.5 rounded">session_id</code></td>
                  <td className="py-2 pr-4">string</td>
                  <td className="py-2">Zorunlu</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4"><code className="text-xs bg-[var(--surface)] px-1.5 py-0.5 rounded">limit</code></td>
                  <td className="py-2 pr-4">number</td>
                  <td className="py-2">1-100, varsayılan: 20</td>
                </tr>
              </tbody>
            </table>
          </div>

          <CodeBlock code={`curl "${baseUrl}/api/chat/history?session_id=user-123&limit=10"`} />
        </Section>

        {/* Clear Session */}
        <Section id="clear" icon={Terminal} title="DELETE /api/chat/session">
          <p className="text-sm text-[var(--text-muted)] mb-4">Bir session'ın tüm konuşma geçmişini siler.</p>
          <CodeBlock code={`curl -X DELETE ${baseUrl}/api/chat/session \\
  -H "Content-Type: application/json" \\
  -d '{ "session_id": "user-123" }'`} />
        </Section>

        {/* Stage Values */}
        <Section id="stages" icon={Gauge} title="Stage Parametresi">
          <p className="text-sm text-[var(--text-muted)] mb-4">
            <code className="text-xs bg-[var(--surface)] px-1.5 py-0.5 rounded">stage</code> parametresi yanıtları tedavi aşamasına göre kişiselleştirir.
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ['initial_consultation', 'İlk Konsültasyon'],
              ['testing', 'Test Aşaması'],
              ['treatment_planning', 'Tedavi Planlama'],
              ['stimulation', 'Stimülasyon'],
              ['egg_retrieval', 'Yumurta Toplama'],
              ['embryo_transfer', 'Embriyo Transferi'],
              ['tww', 'İki Hafta Bekleme'],
              ['pregnancy', 'Gebelik'],
              ['post_treatment', 'Tedavi Sonrası'],
            ].map(([val, label]) => (
              <div key={val} className="flex items-center gap-2 px-3 py-2 bg-[var(--surface)] rounded-lg">
                <code className="text-xs text-[var(--primary)]">{val}</code>
                <span className="text-[var(--text-muted)]">{label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Rate Limiting */}
        <Section id="limits" icon={Shield} title="Rate Limit & Cache">
          <div className="space-y-3 text-sm text-[var(--text)]">
            <div className="flex items-start gap-3 p-3 bg-[var(--surface)] rounded-lg">
              <span className="font-medium min-w-[100px]">Rate Limit</span>
              <span className="text-[var(--text-muted)]">Session başına dakikada belirli sayıda istek. Aşıldığında <code className="text-xs bg-[var(--card)] px-1.5 py-0.5 rounded">429</code> döner.</span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-[var(--surface)] rounded-lg">
              <span className="font-medium min-w-[100px]">Cache</span>
              <span className="text-[var(--text-muted)]">Benzer sorulara verilen yanıtlar belirli süre cache'lenir. Aynı soru tekrar sorulduğunda hızlı yanıt alınır.</span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-[var(--surface)] rounded-lg">
              <span className="font-medium min-w-[100px]">Sentiment</span>
              <span className="text-[var(--text-muted)]">Her yanıtta kullanıcının ruh hali analiz edilir: <code className="text-xs bg-[var(--card)] px-1.5 py-0.5 rounded">positive</code>, <code className="text-xs bg-[var(--card)] px-1.5 py-0.5 rounded">negative</code>, <code className="text-xs bg-[var(--card)] px-1.5 py-0.5 rounded">anxious</code>, <code className="text-xs bg-[var(--card)] px-1.5 py-0.5 rounded">neutral</code></span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <span className="font-medium min-w-[100px] text-amber-700 dark:text-amber-400">Emergency</span>
              <span className="text-amber-700 dark:text-amber-400">Mesajda acil durum tespit edilirse <code className="text-xs bg-[var(--card)] px-1.5 py-0.5 rounded">isEmergency: true</code> ve <code className="text-xs bg-[var(--card)] px-1.5 py-0.5 rounded">emergencyMessage</code> döner. UI'da bunu belirgin şekilde gösterin.</span>
            </div>
          </div>
        </Section>

        {/* WordPress Integration */}
        <Section id="wordpress" icon={Globe} title="WordPress Entegrasyonu">
          <p className="text-sm text-[var(--text-muted)] mb-4">
            WordPress sitenize chat widget'ı eklemek için aşağıdaki kodu temanızın <code className="text-xs bg-[var(--surface)] px-1.5 py-0.5 rounded">functions.php</code> dosyasına veya özel bir eklentiye ekleyin.
          </p>
          <CodeBlock code={getWordPressSnippet(baseUrl)} />

          <p className="text-sm text-[var(--text-muted)] mt-4 mb-2">
            Herhangi bir sayfada kullanmak için shortcode ekleyin:
          </p>
          <CodeBlock code="[ivf_chat]" />
        </Section>

        {/* HTML/JS Embed */}
        <Section id="embed" icon={Code2} title="HTML/JS Embed">
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Herhangi bir web sitesine eklemek için sayfanın sonuna ekleyin.
          </p>
          <CodeBlock code={getEmbedSnippet(baseUrl)} />
        </Section>
      </div>
    </div>
  );
}
