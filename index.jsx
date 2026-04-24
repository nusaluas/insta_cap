import React, { useState, useEffect } from 'react';
import { 
  Search, Layers, Share2, LogIn, Database, X, User,
  GraduationCap, Link as LinkIcon, Type, Send, Image as ImageIcon,
  Video as VideoIcon, Plus, Inbox, Heart, MessageCircle, Bookmark,
  MoreHorizontal, Smile, ChevronDown, Filter, Loader2
} from 'lucide-react';

// URL Google Apps Script terbaru yang Anda berikan
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxTANeMtbkopKarJIbqMfDdnjT9-85cmVJYz9pkcnKFx3iDT0iQPZxX5RuOsHWxcFMfag/exec";
const LOGO_URL = "https://smartcap.or.id/assets/logo.png";

const App = () => {
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('mm_user')) || null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [previewFile, setPreviewFile] = useState(null); 
  const [loginData, setLoginData] = useState({ name: '', class: '' });
  const [message, setMessage] = useState('');
  const [commentText, setCommentText] = useState('');
  
  const [activeFilter, setActiveFilter] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [shareData, setShareData] = useState({ driveLink: '', category: 'Gambar', caption: '' });

  useEffect(() => {
    if (user) setIsLoggedIn(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Mengambil data dari Cloud menggunakan URL baru
      const res = await fetch(`${SCRIPT_URL}?action=read&t=${Date.now()}`);
      const data = await res.json();
      const mappedData = data.map(item => ({
        ...item,
        image: getDriveThumbnail(item.link),
        embedUrl: getEmbedUrl(item.link),
        isLiked: user ? item.likes?.some(l => l.userId === user.name) : false,
        isBookmarked: user ? item.bookmarks?.some(b => b.userId === user.name) : false
      }));
      setArchives(mappedData.reverse());
    } catch (e) {
      showToast("Gagal memuat data dari Cloud");
    } finally {
      setLoading(false);
    }
  };

  const getFileId = (url) => {
    const match = url?.match(/\/file\/d\/(.+?)\/|\?id=(.+?)(&|$)|d\/(.+?)(\/|$)/);
    return match ? (match[1] || match[2] || match[4]) : null;
  };

  const getDriveThumbnail = (url) => {
    const id = getFileId(url);
    return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w800` : "https://via.placeholder.com/400?text=Format+Link+Salah";
  };

  const getEmbedUrl = (url) => {
    const id = getFileId(url);
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const newUser = { ...loginData };
    setUser(newUser);
    setIsLoggedIn(true);
    localStorage.setItem('mm_user', JSON.stringify(newUser));
    setShowLoginModal(false);
    showToast(`Halo, ${newUser.name}!`);
    fetchData(); 
  };

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    
    const payload = {
      id: "ID-" + Date.now(),
      category: shareData.category,
      author: user.name,
      authorClass: user.class,
      link: shareData.driveLink,
      description: shareData.caption,
      timestamp: new Date().toISOString()
    };

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload)
      });
      showToast("Karya berhasil disinkronkan!");
      setShowShareModal(false);
      setShareData({ driveLink: '', category: 'Gambar', caption: '' });
      setTimeout(fetchData, 1000);
    } catch (e) {
      showToast("Gagal mengirim ke Cloud");
    } finally {
      btn.disabled = false;
    }
  };

  const updateCloudSocial = async (id, field, value) => {
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'update_social', id, field, value })
      });
    } catch (e) {
      console.error("Sync error:", e);
    }
  };

  const toggleLike = (id) => {
    if (!isLoggedIn) return setShowLoginModal(true);
    
    setArchives(prev => prev.map(item => {
      if (item.id === id) {
        const isLiked = item.likes?.some(l => l.userId === user.name);
        const newLikes = isLiked 
          ? item.likes.filter(l => l.userId !== user.name)
          : [...(item.likes || []), { userId: user.name, time: new Date().toISOString() }];
        
        updateCloudSocial(id, "Likes", newLikes);
        
        const updatedItem = { ...item, likes: newLikes, isLiked: !isLiked };
        if (previewFile?.id === id) setPreviewFile(updatedItem);
        return updatedItem;
      }
      return item;
    }));
  };

  const toggleBookmark = (id) => {
    if (!isLoggedIn) return setShowLoginModal(true);
    
    setArchives(prev => prev.map(item => {
      if (item.id === id) {
        const isBookmarked = item.bookmarks?.some(b => b.userId === user.name);
        const newBookmarks = isBookmarked 
          ? item.bookmarks.filter(b => b.userId !== user.name)
          : [...(item.bookmarks || []), { userId: user.name }];
        
        updateCloudSocial(id, "Bookmarks", newBookmarks);
        const updatedItem = { ...item, bookmarks: newBookmarks, isBookmarked: !isBookmarked };
        if (previewFile?.id === id) setPreviewFile(updatedItem);
        return updatedItem;
      }
      return item;
    }));
  };

  const addComment = (e) => {
    e.preventDefault();
    if (!isLoggedIn) return setShowLoginModal(true);
    if (!commentText.trim()) return;
    
    const newComment = {
      id: Date.now(),
      user: user.name,
      text: commentText,
      time: 'Baru saja'
    };

    setArchives(prev => prev.map(item => {
      if (item.id === previewFile.id) {
        const newComments = [...(item.comments || []), newComment];
        updateCloudSocial(item.id, "Comments", newComments);
        const updatedItem = { ...item, comments: newComments };
        setPreviewFile(updatedItem);
        return updatedItem;
      }
      return item;
    }));
    setCommentText('');
  };

  const showToast = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem('mm_user');
    showToast("Berhasil keluar.");
    fetchData();
  };

  const filteredArchives = archives.filter(item => {
    const matchesCat = activeFilter === 'Semua' || item.category === activeFilter;
    const matchesSearch = item.description?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.author?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0a0c10] text-gray-100 font-sans p-4 md:p-8 relative overflow-x-hidden selection:bg-cyan-500/30">
      {message && (
        <div className="fixed top-4 right-4 z-[100] bg-cyan-600 text-white px-6 py-3 rounded-lg shadow-2xl border border-cyan-400 animate-in fade-in slide-in-from-top-4 duration-300">
          {message}
        </div>
      )}

      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-gray-800 pb-6">
        <div className="flex items-center gap-3 text-white">
          <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg shadow-cyan-500/10 flex items-center justify-center bg-gray-900 border border-gray-800">
            <img 
              src={LOGO_URL} 
              alt="Logo SmartCap" 
              className="w-full h-full object-contain p-1"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = 'MM';
              }}
            />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] text-cyan-500 font-black leading-none mb-1">Multimedia Station</p>
            <h1 className="text-2xl font-bold tracking-tighter uppercase">CAP <span className="font-light text-gray-400">INSTA</span></h1>
          </div>
        </div>

        <div className="flex gap-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-3 bg-gray-800/30 pl-4 pr-1 py-1 rounded-full border border-gray-700">
              <span className="text-xs font-bold uppercase tracking-tight text-cyan-400">{user.name.split(' ')[0]}</span>
              <button onClick={handleLogout} className="bg-gray-700 hover:bg-red-600 p-1.5 rounded-full transition-all"><X size={12} /></button>
            </div>
          ) : (
            <button onClick={() => setShowLoginModal(true)} className="bg-white text-black px-5 py-2 rounded font-black text-xs hover:bg-gray-200 transition-all uppercase tracking-widest">Masuk</button>
          )}
          <button onClick={() => isLoggedIn ? setShowShareModal(true) : setShowLoginModal(true)} className="flex items-center gap-2 bg-cyan-600 text-white px-5 py-2 rounded font-bold text-xs hover:bg-cyan-700 transition-all border border-cyan-500 shadow-lg shadow-cyan-500/20 uppercase tracking-widest">
            <Plus size={16} /> Bagikan
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {/* STATS & SEARCH */}
        <div className="flex flex-col lg:flex-row gap-4 mb-12">
            <div className="flex gap-3">
                <div className="bg-[#14181f] border border-gray-800 rounded-2xl p-5 flex items-center gap-4 min-w-[140px] text-white">
                    <Database className="text-cyan-400" size={20} />
                    <div>
                        <p className="text-xl font-black">{archives.length.toString().padStart(2, '0')}</p>
                        <p className="text-[9px] uppercase text-gray-500 font-bold tracking-widest">Karya</p>
                    </div>
                </div>
                <div className="bg-[#14181f] border border-gray-800 rounded-2xl p-5 flex items-center gap-4 min-w-[140px] text-white">
                    <Layers className="text-purple-400" size={20} />
                    <div>
                        <p className="text-xl font-black">{new Set(archives.map(a => a.category)).size.toString().padStart(2, '0')}</p>
                        <p className="text-[9px] uppercase text-gray-500 font-bold tracking-widest">Kategori</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-[#14181f] border border-gray-800 rounded-2xl flex items-center group focus-within:border-cyan-500/50 transition-all overflow-hidden">
                <div className="pl-5 pr-3 text-gray-600 group-focus-within:text-cyan-500"><Search size={20} /></div>
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari karya digital..." 
                    className="bg-transparent border-none focus:ring-0 w-full text-sm py-4 text-gray-300 outline-none pr-4" 
                />
                <div className="h-full flex items-center pr-2 relative">
                    <div className="h-8 w-[1px] bg-gray-800 mx-2"></div>
                    <select 
                        value={activeFilter}
                        onChange={(e) => setActiveFilter(e.target.value)}
                        className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-cyan-500 border-none focus:ring-0 cursor-pointer pr-8 pl-2 outline-none appearance-none"
                    >
                        <option value="Semua" className="bg-[#14181f]">Semua</option>
                        <option value="Gambar" className="bg-[#14181f]">Gambar</option>
                        <option value="Video" className="bg-[#14181f]">Video</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2 pointer-events-none text-cyan-500/50" />
                </div>
            </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 uppercase font-black tracking-widest text-xs">
            <Loader2 size={40} className="animate-spin text-cyan-500 mb-4" />
            Sinkronisasi Cloud...
          </div>
        ) : filteredArchives.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-800/50 rounded-[2.5rem] bg-[#14181f]/10">
            <Inbox size={40} className="text-gray-800 mb-4" />
            <h2 className="text-xl font-bold text-gray-400 uppercase italic">Arsip Kosong</h2>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredArchives.map((item) => (
              <div key={item.id} className="group bg-[#14181f] border border-gray-800 rounded-3xl overflow-hidden shadow-xl transition-all hover:-translate-y-1">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-cyan-900/30 flex items-center justify-center text-[10px] font-bold text-cyan-500 border border-cyan-500/20">{item.author[0]}</div>
                    <span className="text-[10px] font-bold uppercase text-white truncate max-w-[80px]">{item.author}</span>
                  </div>
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-gray-900 text-gray-500 border border-gray-800 uppercase">{item.category}</span>
                </div>

                <div onClick={() => setPreviewFile(item)} className="relative aspect-square cursor-pointer overflow-hidden bg-black">
                  <img src={item.image} alt={item.description} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" />
                  <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md p-1.5 rounded-full border border-white/10">
                    {item.category === "Video" ? <VideoIcon size={12} /> : <ImageIcon size={12} />}
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <Heart onClick={(e) => {e.stopPropagation(); toggleLike(item.id)}} size={20} className={`cursor-pointer transition-all active:scale-125 ${item.isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                    <MessageCircle onClick={() => setPreviewFile(item)} size={20} className="text-white cursor-pointer hover:text-cyan-500" />
                    <Bookmark onClick={(e) => {e.stopPropagation(); toggleBookmark(item.id)}} size={20} className={`ml-auto cursor-pointer ${item.isBookmarked ? 'fill-white text-white' : 'text-white'}`} />
                  </div>
                  <p className="text-[10px] font-black text-white">{item.likes?.length || 0} suka</p>
                  <p className="text-[11px] text-gray-400 line-clamp-1 italic">"{item.description}"</p>
                  <p onClick={() => setPreviewFile(item)} className="text-[9px] text-gray-600 font-bold uppercase cursor-pointer hover:text-gray-400">Lihat {item.comments?.length || 0} komentar</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* PREVIEW MODAL */}
      {previewFile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-0 md:p-10">
          <button onClick={() => setPreviewFile(null)} className="absolute top-4 right-4 z-[70] text-white/50 hover:text-white"><X size={32} /></button>
          <div className="bg-[#14181f] w-full max-w-6xl h-full md:h-[85vh] rounded-none md:rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row border border-gray-800">
            <div className="flex-[1.5] bg-black relative flex items-center justify-center min-h-[300px] border-r border-gray-800">
              {previewFile.embedUrl ? (
                <iframe src={previewFile.embedUrl} className="w-full h-full border-none" allow="autoplay" title="Preview"></iframe>
              ) : (
                <div className="text-gray-500 uppercase font-black text-xs">Pratinjau tidak tersedia</div>
              )}
            </div>
            <div className="flex-1 flex flex-col bg-[#0f1117] h-full overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center font-bold text-xs uppercase">{previewFile.author[0]}</div>
                  <div>
                    <h5 className="text-xs font-bold text-white leading-none">{previewFile.author}</h5>
                    <p className="text-[10px] text-cyan-500 font-bold uppercase mt-1">{previewFile.authorClass}</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="text-xs italic text-gray-400 mb-6">"{previewFile.description}"</div>
                {previewFile.comments?.map(comment => (
                  <div key={comment.id} className="flex gap-3 animate-in slide-in-from-left-2">
                    <div className="w-7 h-7 rounded-full bg-gray-800 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-gray-500">{comment.user?.[0]}</div>
                    <div className="text-xs leading-relaxed">
                      <span className="font-bold mr-2 text-white">{comment.user}</span>
                      <span className="text-gray-300">{comment.text}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Heart onClick={() => toggleLike(previewFile.id)} size={24} className={`cursor-pointer active:scale-125 ${previewFile.isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                    <MessageCircle size={24} className="text-white" />
                  </div>
                  <Bookmark onClick={() => toggleBookmark(previewFile.id)} size={24} className={previewFile.isBookmarked ? 'fill-white text-white' : 'text-white'} />
                </div>
                <p className="text-xs font-bold text-white">{previewFile.likes?.length || 0} menyukai</p>
              </div>
              <form onSubmit={addComment} className="p-4 border-t border-gray-800 flex items-center gap-3">
                <Smile size={20} className="text-gray-400" />
                <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Tambahkan komentar..." className="bg-transparent border-none focus:ring-0 text-xs text-white flex-1 outline-none" />
                <button type="submit" disabled={!commentText.trim()} className={`text-xs font-bold ${commentText.trim() ? 'text-cyan-500' : 'text-cyan-900'}`}>Kirim</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#14181f] border border-gray-800 w-full max-w-md rounded-2xl p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-black text-center mb-6 uppercase tracking-widest italic text-white">Identitas <span className="text-cyan-500">Siswa</span></h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <input required type="text" value={loginData.name} onChange={(e) => setLoginData({...loginData, name: e.target.value})} placeholder="Nama Lengkap" className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-cyan-500 text-sm text-white" />
              <input required type="text" value={loginData.class} onChange={(e) => setLoginData({...loginData, class: e.target.value})} placeholder="Kelas (XII MM 1)" className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-cyan-500 text-sm text-white" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 bg-gray-800 py-4 rounded-xl font-black uppercase text-xs tracking-widest text-white">Batal</button>
                <button type="submit" className="flex-2 bg-cyan-600 py-4 rounded-xl font-black uppercase text-xs tracking-widest text-white flex-[2]">Akses Cloud</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#14181f] border border-gray-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative text-white animate-in zoom-in-95 duration-200">
            <div className="bg-cyan-600 px-6 py-4 flex justify-between items-center">
              <h3 className="font-black text-xs uppercase tracking-[0.2em] italic">Bagikan Karya Digital</h3>
              <button onClick={() => setShowShareModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleShareSubmit} className="p-6 space-y-4">
              <div className="flex gap-2">
                {["Gambar", "Video"].map(cat => (
                  <button key={cat} type="button" onClick={() => setShareData({...shareData, category: cat})} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${shareData.category === cat ? 'bg-cyan-600 border-cyan-400' : 'bg-black/50 border-gray-700 text-gray-500'}`}>{cat}</button>
                ))}
              </div>
              <input required type="url" value={shareData.driveLink} onChange={(e) => setShareData({...shareData, driveLink: e.target.value})} placeholder="Link Google Drive (Akses Publik)" className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-cyan-500 text-sm text-white" />
              <textarea required rows="3" value={shareData.caption} onChange={(e) => setShareData({...shareData, caption: e.target.value})} placeholder="Deskripsi singkat..." className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-cyan-500 text-sm resize-none text-white" />
              <button type="submit" className="w-full bg-white text-black font-black py-4 rounded-xl uppercase text-xs tracking-[0.2em] hover:bg-cyan-400 transition-all">Upload ke Cloud</button>
            </form>
          </div>
        </div>
      )}

      <footer className="mt-20 py-8 border-t border-gray-900 text-center text-[9px] text-gray-700 font-bold uppercase tracking-[0.3em]">
        Multimedia Station • Cloud Integrated v3.0
      </footer>
    </div>
  );
};

export default App;