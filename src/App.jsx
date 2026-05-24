import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import './styles.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div className="center">Loading...</div>
  return session ? <ScienceApp session={session} /> : <Auth />
}

function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setMsg('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) setMsg(error.message)
        else setMsg('Account created successfully. Please log in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setMsg(error.message)
      }
    } catch {
      setMsg('Something went wrong.')
    }
    setLoading(false)
  }

  return (
    <div className="authPage">
      <form className="authCard" onSubmit={handleSubmit}>
        <div className="logo">🧠</div>
        <h1>Cambridge Science Mind Map</h1>
        <p>Ôn tập Science bằng tab chủ đề, sơ đồ tư duy, hình ảnh và ghi chú.</p>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit" disabled={loading}>{loading ? 'Loading...' : mode === 'login' ? 'Log in' : 'Create account'}</button>
        <button type="button" className="ghost" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Create new account' : 'Back to login'}
        </button>
        {msg && <div className="message">{msg}</div>}
      </form>
    </div>
  )
}

function ScienceApp({ session }) {
  const userId = session.user.id
  const [tabs, setTabs] = useState([])
  const [activeTabId, setActiveTabId] = useState(null)
  const [nodes, setNodes] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [tabName, setTabName] = useState('')
  const [status, setStatus] = useState('')
  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId])

  useEffect(() => { loadTabs() }, [])
  useEffect(() => { if (activeTabId) loadNodes(activeTabId) }, [activeTabId])

  async function loadTabs() {
    setStatus('Loading tabs...')
    const { data, error } = await supabase.from('science_tabs').select('*').order('created_at', { ascending: true })
    if (error) { setStatus(error.message); return }
    if (!data || data.length === 0) { await createTab('Plants'); return }
    setTabs(data)
    setActiveTabId(data[0].id)
    setStatus('')
  }

  async function loadNodes(tabId) {
    setStatus('Loading mind map...')
    const { data, error } = await supabase.from('science_nodes').select('*').eq('tab_id', tabId).order('created_at', { ascending: true })
    if (error) { setStatus(error.message); return }
    setNodes(data || [])
    setSelectedNode(null)
    setStatus('')
  }

  async function createTab(name) {
    const cleanName = name.trim() || 'New Topic'
    const { data, error } = await supabase.from('science_tabs').insert({ user_id: userId, name: cleanName }).select().single()
    if (error) { setStatus(error.message); return }
    setTabs(prev => [...prev, data])
    setActiveTabId(data.id)
    setTabName('')
    setStatus('')
  }

  async function renameTab() {
    if (!activeTab || !tabName.trim()) return
    const { data, error } = await supabase.from('science_tabs').update({ name: tabName.trim() }).eq('id', activeTab.id).select().single()
    if (error) { setStatus(error.message); return }
    setTabs(prev => prev.map(t => t.id === data.id ? data : t))
    setTabName('')
  }

  async function deleteTab() {
    if (!activeTab) return
    if (!window.confirm('Delete this topic and all nodes?')) return
    const { error } = await supabase.from('science_tabs').delete().eq('id', activeTab.id)
    if (error) { setStatus(error.message); return }
    const remaining = tabs.filter(t => t.id !== activeTab.id)
    setTabs(remaining)
    setActiveTabId(remaining[0]?.id || null)
    setNodes([])
  }

  async function addNode(parentId = null) {
    if (!activeTabId) return
    const { data, error } = await supabase.from('science_nodes').insert({
      user_id: userId,
      tab_id: activeTabId,
      parent_id: parentId,
      keyword: parentId ? 'New branch' : 'Main idea',
      explanation: '',
      image_url: '',
      x: 120 + nodes.length * 30,
      y: 110 + nodes.length * 20,
      w: 190,
      h: 120
    }).select().single()
    if (error) { setStatus(error.message); return }
    setNodes(prev => [...prev, data])
    setSelectedNode(data)
  }

  async function updateNode(updated) {
    setNodes(prev => prev.map(n => n.id === updated.id ? updated : n))
    setSelectedNode(updated)
    const { error } = await supabase.from('science_nodes').update({
      parent_id: updated.parent_id,
      keyword: updated.keyword,
      explanation: updated.explanation,
      image_url: updated.image_url,
      x: updated.x,
      y: updated.y,
      w: updated.w,
      h: updated.h
    }).eq('id', updated.id)
    if (error) setStatus(error.message)
  }

  async function deleteNode(nodeId) {
    const { error } = await supabase.from('science_nodes').delete().eq('id', nodeId)
    if (error) { setStatus(error.message); return }
    setNodes(prev => prev.filter(n => n.id !== nodeId && n.parent_id !== nodeId))
    setSelectedNode(null)
  }

  async function logout() { await supabase.auth.signOut() }

  return (
    <div className="appShell">
      <header className="topbar">
        <div><h1>Science Mind Map</h1><p>{session.user.email}</p></div>
        <div className="actions"><button onClick={() => addNode(null)}>+ Main keyword</button><button className="ghostBtn" onClick={logout}>Logout</button></div>
      </header>
      {status && <div className="status">{status}</div>}
      <main className="workspace">
        <section className="canvasWrap"><MindMapCanvas nodes={nodes} selectedNode={selectedNode} onSelect={setSelectedNode} onMove={updateNode} onAddChild={addNode} /></section>
        <aside className="editor"><h2>Keyword details</h2>{!selectedNode ? <p className="muted">Bấm vào một ô keyword để sửa nội dung.</p> : <NodeEditor node={selectedNode} nodes={nodes} onChange={updateNode} onDelete={deleteNode} onAddChild={addNode} />}</aside>
      </main>
      <footer className="sheetTabs">
        <div className="tabScroller">{tabs.map(tab => <button key={tab.id} className={tab.id === activeTabId ? 'sheet active' : 'sheet'} onClick={() => setActiveTabId(tab.id)}>{tab.name}</button>)}</div>
        <div className="tabTools"><input placeholder={activeTab ? 'Rename or new topic' : 'New topic'} value={tabName} onChange={e => setTabName(e.target.value)} /><button onClick={() => createTab(tabName)}>+ Tab</button><button onClick={renameTab} disabled={!activeTab}>Rename</button><button className="danger" onClick={deleteTab} disabled={!activeTab}>Delete</button></div>
      </footer>
    </div>
  )
}

function MindMapCanvas({ nodes, selectedNode, onSelect, onMove, onAddChild }) {
  const nodeMap = useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes])
  const lines = nodes.filter(n => n.parent_id && nodeMap[n.parent_id]).map(n => {
    const p = nodeMap[n.parent_id]
    return { id: n.id, x1: p.x + p.w / 2, y1: p.y + p.h / 2, x2: n.x + n.w / 2, y2: n.y + n.h / 2 }
  })

  function startDrag(e, node) {
    e.preventDefault()
    onSelect(node)
    const startX = e.clientX, startY = e.clientY
    const original = { x: node.x, y: node.y }
    function move(ev) { onMove({ ...node, x: Math.max(10, original.x + ev.clientX - startX), y: Math.max(10, original.y + ev.clientY - startY) }) }
    function up() { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  return (
    <div className="canvas">
      <svg className="lines">{lines.map(line => <line key={line.id} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />)}</svg>
      {nodes.length === 0 && <div className="emptyHint">Bấm “+ Main keyword” để tạo ô đầu tiên cho chủ đề này.</div>}
      {nodes.map(node => <div key={node.id} className={selectedNode?.id === node.id ? 'node selected' : 'node'} style={{ left: node.x, top: node.y, width: node.w, minHeight: node.h }} onMouseDown={e => startDrag(e, node)} onClick={e => { e.stopPropagation(); onSelect(node) }}>
        <div className="nodeTitle">{node.keyword}</div>
        {node.image_url && <img src={node.image_url} alt="" />}
        {node.explanation && <div className="nodeText">{node.explanation}</div>}
        <button className="tiny" onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onAddChild(node.id) }}>+ branch</button>
      </div>)}
    </div>
  )
}

function NodeEditor({ node, nodes, onChange, onDelete, onAddChild }) {
  function updateField(field, value) { onChange({ ...node, [field]: value }) }
  return <div className="editorForm">
    <label>Keyword</label><input value={node.keyword || ''} onChange={e => updateField('keyword', e.target.value)} />
    <label>Explanation box</label><textarea value={node.explanation || ''} onChange={e => updateField('explanation', e.target.value)} placeholder="Giải thích bằng tiếng Anh hoặc tiếng Việt..." />
    <label>Image URL</label><input value={node.image_url || ''} onChange={e => updateField('image_url', e.target.value)} placeholder="Dán link hình ảnh vào đây" />
    <label>Parent branch</label><select value={node.parent_id || ''} onChange={e => updateField('parent_id', e.target.value || null)}><option value="">No parent / main keyword</option>{nodes.filter(n => n.id !== node.id).map(n => <option key={n.id} value={n.id}>{n.keyword}</option>)}</select>
    <div className="sizeGrid"><div><label>Width</label><input type="number" value={node.w || 190} onChange={e => updateField('w', Number(e.target.value))} /></div><div><label>Height</label><input type="number" value={node.h || 120} onChange={e => updateField('h', Number(e.target.value))} /></div></div>
    <div className="editorButtons"><button onClick={() => onAddChild(node.id)}>+ Add branch</button><button className="danger" onClick={() => onDelete(node.id)}>Delete</button></div>
  </div>
}
