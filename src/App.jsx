import React, { useEffect, useMemo, useState } from 'react'
import { BookOpen, FolderPlus, ImagePlus, LogOut, Plus, Save, Trash2, Edit3, Brain, HelpCircle } from 'lucide-react'
import { supabase } from './supabaseClient'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) return <div className="center">Loading...</div>
  return session ? <ScienceApp session={session} /> : <Auth />
}

function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [msg, setMsg] = useState('')

  async function submit(e) {
    e.preventDefault()
    setMsg('')
    const fn = mode === 'login' ? supabase.auth.signInWithPassword : supabase.auth.signUp
    const { error } = await fn({ email, password })
    if (error) setMsg(error.message)
    else if (mode === 'signup') setMsg('Account created. Check email confirmation if Supabase asks for it.')
  }

  return <div className="authPage">
    <form className="authCard" onSubmit={submit}>
      <div className="logo"><Brain size={34}/></div>
      <h1>Cambridge Science Mind Map</h1>
      <p>Ôn tập Science bằng sơ đồ tư duy, hình ảnh và quiz.</p>
      <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button>{mode === 'login' ? 'Log in' : 'Create account'}</button>
      <button type="button" className="ghost" onClick={()=>setMode(mode === 'login' ? 'signup' : 'login')}>
        {mode === 'login' ? 'Create new account' : 'Back to login'}
      </button>
      {msg && <div className="message">{msg}</div>}
    </form>
  </div>
}

function ScienceApp({ session }) {
  const user = session.user
  const [folders, setFolders] = useState([])
  const [maps, setMaps] = useState([])
  const [nodes, setNodes] = useState([])
  const [folderId, setFolderId] = useState(null)
  const [mapId, setMapId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [quizMode, setQuizMode] = useState(false)

  useEffect(()=>{ loadFolders() }, [])
  useEffect(()=>{ if(folderId) loadMaps(folderId); else setMaps([]) }, [folderId])
  useEffect(()=>{ if(mapId) loadNodes(mapId); else setNodes([]) }, [mapId])

  async function loadFolders() {
    const { data } = await supabase.from('science_folders').select('*').order('created_at', { ascending:false })
    setFolders(data || [])
  }
  async function loadMaps(fid) {
    const { data } = await supabase.from('science_maps').select('*').eq('folder_id', fid).order('created_at', { ascending:false })
    setMaps(data || [])
    if (data?.length && !data.find(m=>m.id===mapId)) setMapId(data[0].id)
    if (!data?.length) setMapId(null)
  }
  async function loadNodes(mid) {
    const { data } = await supabase.from('science_nodes').select('*').eq('map_id', mid).order('created_at', { ascending:true })
    setNodes(data || [])
    setSelected(null)
  }
  async function addFolder() {
    const name = prompt('Tên chủ đề / folder? Ví dụ: Plants')
    if(!name) return
    await supabase.from('science_folders').insert({ name, user_id:user.id })
    loadFolders()
  }
  async function renameFolder(f) {
    const name = prompt('Tên mới?', f.name)
    if(!name) return
    await supabase.from('science_folders').update({ name }).eq('id', f.id)
    loadFolders()
  }
  async function deleteFolder(f) {
    if(!confirm('Xoá folder này và các mind map bên trong?')) return
    await supabase.from('science_folders').delete().eq('id', f.id)
    if(folderId === f.id) { setFolderId(null); setMapId(null) }
    loadFolders()
  }
  async function addMap() {
    if(!folderId) return alert('Chọn folder trước')
    const title = prompt('Tên mind map? Ví dụ: Parts of a plant')
    if(!title) return
    const { data } = await supabase.from('science_maps').insert({ title, folder_id:folderId, user_id:user.id }).select().single()
    await supabase.from('science_nodes').insert({ map_id:data.id, user_id:user.id, keyword:title, explanation_en:'Main topic', meaning_vi:'Chủ đề chính', parent_id:null, x:420, y:260 })
    loadMaps(folderId); setMapId(data.id)
  }
  async function deleteMap(m) {
    if(!confirm('Xoá mind map này?')) return
    await supabase.from('science_maps').delete().eq('id', m.id)
    loadMaps(folderId)
  }
  async function addNode(parent=null) {
    if(!mapId) return alert('Chọn mind map trước')
    const keyword = prompt('Keyword tiếng Anh?')
    if(!keyword) return
    const count = nodes.length
    const angle = count * 0.8
    await supabase.from('science_nodes').insert({
      map_id:mapId, user_id:user.id, parent_id: parent?.id || nodes[0]?.id || null,
      keyword, meaning_vi:'', explanation_en:'', example_en:'', x: 420 + Math.cos(angle)*220, y:260 + Math.sin(angle)*160
    })
    loadNodes(mapId)
  }
  async function saveNode(n) {
    const { id, keyword, meaning_vi, explanation_en, example_en, image_url, x, y, parent_id } = n
    await supabase.from('science_nodes').update({ keyword, meaning_vi, explanation_en, example_en, image_url, x, y, parent_id }).eq('id', id)
    loadNodes(mapId)
  }
  async function deleteNode(n) {
    if(!confirm('Xoá keyword này?')) return
    await supabase.from('science_nodes').delete().eq('id', n.id)
    setSelected(null); loadNodes(mapId)
  }
  async function uploadImage(file, node) {
    if(!file) return
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${node.id}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('science-images').upload(path, file, { upsert:true })
    if(error) return alert(error.message)
    const { data } = supabase.storage.from('science-images').getPublicUrl(path)
    const updated = { ...node, image_url:data.publicUrl }
    setSelected(updated)
    await saveNode(updated)
  }

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><BookOpen/> <b>Science</b></div>
      <button className="add" onClick={addFolder}><FolderPlus size={18}/> New folder</button>
      <div className="sectionTitle">Folders</div>
      {folders.map(f => <div className={`row ${folderId===f.id?'active':''}`} key={f.id} onClick={()=>setFolderId(f.id)}>
        <span>{f.name}</span><div><Edit3 size={14} onClick={(e)=>{e.stopPropagation();renameFolder(f)}}/> <Trash2 size={14} onClick={(e)=>{e.stopPropagation();deleteFolder(f)}}/></div>
      </div>)}
      <button className="logout" onClick={()=>supabase.auth.signOut()}><LogOut size={16}/> Log out</button>
    </aside>

    <main>
      <header>
        <div>
          <h2>{folders.find(f=>f.id===folderId)?.name || 'Chọn hoặc tạo folder'}</h2>
          <p>Tạo mind map cho từng bài Science Cambridge.</p>
        </div>
        <button onClick={addMap}><Plus size={18}/> New mind map</button>
      </header>

      <div className="mapsBar">
        {maps.map(m => <button className={mapId===m.id?'pill activePill':'pill'} onClick={()=>setMapId(m.id)} key={m.id}>{m.title} <Trash2 size={13} onClick={(e)=>{e.stopPropagation();deleteMap(m)}}/></button>)}
      </div>

      {quizMode ? <Quiz nodes={nodes} onBack={()=>setQuizMode(false)} /> : <div className="workspace">
        <MindMap nodes={nodes} onSelect={setSelected} onAdd={addNode}/>
        <NodePanel node={selected} nodes={nodes} onChange={setSelected} onSave={saveNode} onDelete={deleteNode} onUpload={uploadImage} onAddChild={addNode} onQuiz={()=>setQuizMode(true)} />
      </div>}
    </main>
  </div>
}

function MindMap({ nodes, onSelect, onAdd }) {
  const lines = nodes.filter(n=>n.parent_id).map(n => [nodes.find(p=>p.id===n.parent_id), n]).filter(x=>x[0])
  return <div className="canvas">
    <svg className="lines">{lines.map(([p,n])=><line key={n.id} x1={p.x+70} y1={p.y+30} x2={n.x+70} y2={n.y+30}/>)}</svg>
    {nodes.map(n => <button key={n.id} className={`node ${!n.parent_id?'rootNode':''}`} style={{left:n.x, top:n.y}} onClick={()=>onSelect(n)}>
      {n.image_url && <img src={n.image_url}/>}<span>{n.keyword}</span>
    </button>)}
    {!nodes.length && <div className="empty">Chưa có keyword. Hãy tạo mind map mới.</div>}
    {nodes.length > 0 && <button className="floatingAdd" onClick={()=>onAdd()}><Plus/> Add keyword</button>}
  </div>
}

function NodePanel({ node, nodes, onChange, onSave, onDelete, onUpload, onAddChild, onQuiz }) {
  if(!node) return <aside className="panel"><h3>Keyword card</h3><p>Bấm vào một keyword trên mind map để xem giải thích lớn.</p><button onClick={onQuiz}><HelpCircle size={16}/> Quiz me</button></aside>
  const set = (k,v)=>onChange({...node,[k]:v})
  return <aside className="panel">
    <h3>Keyword card</h3>
    {node.image_url && <img className="preview" src={node.image_url}/>}    
    <label>Keyword</label><input value={node.keyword||''} onChange={e=>set('keyword',e.target.value)}/>
    <label>Nghĩa tiếng Việt</label><input value={node.meaning_vi||''} onChange={e=>set('meaning_vi',e.target.value)}/>
    <label>Explain in simple English</label><textarea value={node.explanation_en||''} onChange={e=>set('explanation_en',e.target.value)} />
    <label>Example sentence</label><textarea value={node.example_en||''} onChange={e=>set('example_en',e.target.value)} />
    <label>Parent branch</label><select value={node.parent_id||''} onChange={e=>set('parent_id', e.target.value || null)}>
      <option value="">Main topic</option>{nodes.filter(n=>n.id!==node.id).map(n=><option key={n.id} value={n.id}>{n.keyword}</option>)}
    </select>
    <label className="upload"><ImagePlus size={16}/> Upload image<input type="file" accept="image/*" onChange={e=>onUpload(e.target.files[0], node)}/></label>
    <div className="panelButtons"><button onClick={()=>onSave(node)}><Save size={16}/> Save</button><button onClick={()=>onAddChild(node)}><Plus size={16}/> Child</button><button className="danger" onClick={()=>onDelete(node)}><Trash2 size={16}/></button></div>
  </aside>
}

function Quiz({ nodes, onBack }) {
  const pool = nodes.filter(n=>n.explanation_en || n.meaning_vi)
  const [i, setI] = useState(0)
  const [show, setShow] = useState(false)
  const n = pool[i % Math.max(pool.length,1)]
  if(!pool.length) return <div className="quiz"><button onClick={onBack}>Back</button><h2>Chưa có dữ liệu quiz</h2><p>Điền explanation hoặc nghĩa tiếng Việt cho keyword trước.</p></div>
  return <div className="quiz"><button onClick={onBack}>Back to mind map</button><h2>Flashcard Quiz</h2><div className="flash" onClick={()=>setShow(!show)}>{show ? <><h3>{n.keyword}</h3><p>{n.meaning_vi}</p><p>{n.explanation_en}</p><em>{n.example_en}</em></> : <h3>{n.keyword}</h3>}</div><button onClick={()=>{setI(i+1);setShow(false)}}>Next</button></div>
}

