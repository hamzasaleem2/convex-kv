import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useMemo, useEffect } from "react";

type Entry = {
  key: string[];
  value: any;
  metadata?: any;
  updatedAt: number;
  expiresAt?: number;
};

export default function App() {
  const entries = useQuery(api.example.list, { prefix: [], includeValues: false }) as Entry[] | undefined;
  const setKv = useMutation(api.example.set);
  const deleteKv = useMutation(api.example.remove);
  const seed = useMutation(api.example.seed);

  const vacuum = useMutation(api.example.vacuum);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [selectedKey, setSelectedKey] = useState<string[] | null>(null);

  const [search, setSearch] = useState("");
  const [isModifying, setIsModifying] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newTtl, setNewTtl] = useState("");

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    if (!search) return entries;
    return entries.filter(e => e.key.join(":").toLowerCase().includes(search.toLowerCase()));
  }, [entries, search]);

  const selectedEntry = useQuery(
    api.example.get,
    selectedKey ? { key: selectedKey } : "skip"
  ) as Entry | null;


  useEffect(() => {
    if (selectedEntry) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditValue(JSON.stringify(selectedEntry.value, null, 2));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsModifying(false);
    }
  }, [selectedEntry]);






  const handleSave = async () => {
    if (!selectedKey) return;
    try {
      const parsedValue = JSON.parse(editValue);
      await setKv({ key: selectedKey, value: parsedValue });
      setIsModifying(false);
    } catch {
      alert("Invalid JSON format");
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const keyParts = newKey.split(":").filter(p => p.trim() !== "");
      let val: any;
      try {
        val = JSON.parse(newValue);
      } catch {
        val = newValue;
      }
      const ttl = newTtl ? parseInt(newTtl) * 1000 : undefined;
      await setKv({ key: keyParts, value: val, ttl });
      setShowAddModal(false);
      setNewKey("");
      setNewValue("");
      setNewTtl("");
      setSelectedKey(keyParts);
    } catch {
      alert("Error adding key");
    }
  };


  const getValueType = (val: any) => {
    if (val === undefined) return null;
    if (Array.isArray(val)) return "LIST";
    if (typeof val === "object" && val !== null) return "HASH";
    return typeof val === "string" ? "STRING" : "VALUE";
  };


  return (
    <div className="app-wrapper">
      <header className="app-header">
        <div className="logo">KV EXPLORER</div>
      </header>

      <div className="workbench">
        <aside className="browser-panel">
          <div className="browser-header">
            <button className="primary" style={{ width: '100%', marginBottom: 16 }} onClick={() => setShowAddModal(true)}>
              NEW KEY
            </button>
            <input
              className="search-box"
              placeholder="Search keys..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="key-list">
            {filteredEntries.map(entry => {
              const type = getValueType(entry.value);
              const isSelected = JSON.stringify(selectedKey) === JSON.stringify(entry.key);
              const isExpired = entry.expiresAt && entry.expiresAt < now;
              return (
                <div
                  key={entry.key.join(":")}
                  className={`key-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedKey(entry.key)}
                  style={{ opacity: isExpired ? 0.4 : 1 }}
                >
                  {type && <span className="key-type-pill">{type}</span>}
                  <span>{entry.key.join(":") || "/"}</span>
                  {entry.expiresAt && !isExpired && (
                    <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 'auto' }}>
                      {Math.ceil((entry.expiresAt - now) / 1000)}s
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ padding: 24, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="secondary" style={{ width: '100%' }} onClick={() => vacuum()}>
              CLEAN EXPIRED
            </button>
            <button className="secondary" style={{ width: '100%', fontSize: 11, opacity: 0.5 }} onClick={() => seed()}>
              RESET DATABASE
            </button>
          </div>
        </aside>

        <main className="workspace">
          {selectedEntry ? (
            <div className="value-editor">
              <div className="editor-header">
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>KEY: </span>
                  <span>{selectedEntry.key.join(":")}</span>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {isModifying ? (
                    <>
                      <button onClick={handleSave}>SAVE</button>
                      <button className="secondary" onClick={() => setIsModifying(false)}>CANCEL</button>
                    </>
                  ) : (
                    <>
                      <button className="secondary" onClick={() => setIsModifying(true)}>EDIT</button>
                      <button className="danger" onClick={() => {
                        deleteKv({ key: selectedEntry.key });
                        setSelectedKey(null);
                      }}>DELETE</button>
                    </>
                  )}
                </div>
              </div>
              <div className="editor-body">
                {isModifying ? (
                  <textarea
                    className="editable-textarea"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    spellCheck={false}
                  />
                ) : (
                  <pre style={{ margin: 0 }}>{JSON.stringify(selectedEntry.value, null, 2)}</pre>
                )}
              </div>
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <span>Type: {getValueType(selectedEntry.value)}</span>
                  <span>Updated: {new Date(selectedEntry.updatedAt).toLocaleString()}</span>
                  {selectedEntry.expiresAt && (
                    <span style={{ color: selectedEntry.expiresAt < now ? 'var(--error)' : 'var(--accent)' }}>
                      {selectedEntry.expiresAt < now
                        ? 'EXPIRED'
                        : `Expires in ${Math.ceil((selectedEntry.expiresAt - now) / 60000)} mins`}
                    </span>
                  )}
                </div>
                <span>{JSON.stringify(selectedEntry.value).length} bytes</span>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>Select a key to view and edit its content</p>
            </div>
          )}
        </main>
      </div>


      {showAddModal && (
        <div className="modal-overlay">
          <form className="modal" onSubmit={handleAddKey}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 24 }}>New Key</div>
            <div className="form-group">
              <label>PATH</label>
              <input
                className="form-input"
                autoFocus
                placeholder="e.g. users:1"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>VALUE</label>
              <textarea
                className="form-input"
                style={{ height: 120, resize: 'vertical' }}
                placeholder='{}'
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>TTL (seconds, optional)</label>
              <input
                className="form-input"
                type="number"
                placeholder="e.g. 3600"
                value={newTtl}
                onChange={e => setNewTtl(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
              <button type="button" className="secondary" onClick={() => setShowAddModal(false)}>CANCEL</button>
              <button type="submit">CREATE</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
