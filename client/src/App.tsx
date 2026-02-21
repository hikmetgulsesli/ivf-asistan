function App() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--surface)' }}>
      <div className="text-center">
        <h1 
          className="text-4xl font-bold mb-4" 
          style={{ 
            fontFamily: 'var(--font-heading)',
            color: 'var(--text)'
          }}
        >
          IVF Asistan
        </h1>
        <p 
          className="text-lg"
          style={{ 
            color: 'var(--text-muted)'
          }}
        >
          Tüp Bebek Klinikleri için Akıllı Hasta Rehberi
        </p>
      </div>
    </div>
  );
}

export default App;
