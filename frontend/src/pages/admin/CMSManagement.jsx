import React, { useState, useEffect } from 'react';
import AdminHeader from '../../components/AdminHeader';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/api';
import toast from 'react-hot-toast';

export default function CMSManagement() {
  const [blocks, setBlocks] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBlock, setCurrentBlock] = useState({ type: 'HeroSlider', title: '', content: {}, sortOrder: 0, isActive: true });
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file); // backend uses 'image' field for both images and videos
    try {
      setUploadingMedia(true);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setCurrentBlock(prev => ({
        ...prev,
        content: {
          ...prev.content,
          [fieldName]: res.data.image || res.data.fileUrl
        }
      }));
      toast.success('File uploaded successfully');
    } catch (err) {
      toast.error('Failed to upload file');
    } finally {
      setUploadingMedia(false);
    }
  };

  const renderContentFields = () => {
    const type = currentBlock.type;

    const handleContentChange = (field, value) => {
      setCurrentBlock(prev => ({
        ...prev,
        content: { ...prev.content, [field]: value }
      }));
    };

    if (['IntroSection', 'ProgramsSection', 'PricingSection', 'CTASection'].includes(type)) {
      return (
        <div className="space-y-4 p-5 bg-slate-50 rounded-xl border border-slate-100 mt-4">
          <h3 className="font-bold text-slate-700 text-sm">Text Content Settings</h3>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Kicker / Tagline</label>
            <input type="text" value={currentBlock.content?.kicker || ''} onChange={e => handleContentChange('kicker', e.target.value)} className="mt-1 w-full p-3 border-none bg-white rounded-lg shadow-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Headline</label>
            <input type="text" value={currentBlock.content?.headline || ''} onChange={e => handleContentChange('headline', e.target.value)} className="mt-1 w-full p-3 border-none bg-white rounded-lg shadow-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Description</label>
            <textarea value={currentBlock.content?.description || ''} onChange={e => handleContentChange('description', e.target.value)} className="mt-1 w-full p-3 border-none bg-white rounded-lg shadow-sm" rows="3"></textarea>
          </div>
        </div>
      );
    }

    if (type === 'HeroSlider' || type === 'ImageBanner') {
      return (
        <div className="space-y-4 p-5 bg-slate-50 rounded-xl border border-slate-100 mt-4">
          <h3 className="font-bold text-slate-700 text-sm">Image Settings</h3>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Image Upload</label>
            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'imageUrl')} className="mt-1 w-full p-2 border-none bg-white rounded-lg shadow-sm" />
            {uploadingMedia && <p className="text-xs text-brand-blue mt-2 font-bold animate-pulse">Uploading...</p>}
            {currentBlock.content?.imageUrl && (
              <img src={currentBlock.content.imageUrl.startsWith('http') ? currentBlock.content.imageUrl : `http://localhost:5000${currentBlock.content.imageUrl}`} alt="Preview" className="mt-4 h-24 rounded-lg object-cover shadow-sm" />
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Headline / Alt Text</label>
            <input type="text" value={currentBlock.content?.headline || ''} onChange={e => handleContentChange('headline', e.target.value)} className="mt-1 w-full p-3 border-none bg-white rounded-lg shadow-sm" />
          </div>
        </div>
      );
    }

    if (type === 'VideoBlock') {
      return (
        <div className="space-y-4 p-5 bg-slate-50 rounded-xl border border-slate-100 mt-4">
          <h3 className="font-bold text-slate-700 text-sm">Video Settings</h3>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Upload Video (MP4/WEBM)</label>
            <input type="file" accept="video/mp4,video/webm,video/ogg" onChange={(e) => handleFileUpload(e, 'videoUrl')} className="mt-1 w-full p-2 border-none bg-white rounded-lg shadow-sm" />
            {uploadingMedia && <p className="text-xs text-brand-blue mt-2 font-bold animate-pulse">Uploading video, please wait...</p>}
            {currentBlock.content?.videoUrl && currentBlock.content.videoUrl.match(/\.(mp4|webm|ogg)$/i) && (
              <p className="text-xs text-emerald-600 mt-2 font-bold">✓ Video uploaded successfully</p>
            )}
          </div>
          <div className="flex items-center">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="px-4 text-xs font-bold text-slate-400">OR</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Video URL (e.g. YouTube Embed URL)</label>
            <input type="text" value={currentBlock.content?.videoUrl || ''} onChange={e => handleContentChange('videoUrl', e.target.value)} className="mt-1 w-full p-3 border-none bg-white rounded-lg shadow-sm" placeholder="https://www.youtube.com/embed/..." />
          </div>
        </div>
      );
    }

    if (type === 'TextSection') {
      return (
        <div className="space-y-4 p-5 bg-slate-50 rounded-xl border border-slate-100 mt-4">
          <h3 className="font-bold text-slate-700 text-sm">Text Block Settings</h3>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Subtitle</label>
            <input type="text" value={currentBlock.content?.subtitle || ''} onChange={e => handleContentChange('subtitle', e.target.value)} className="mt-1 w-full p-3 border-none bg-white rounded-lg shadow-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Content</label>
            <textarea value={currentBlock.content?.text || ''} onChange={e => handleContentChange('text', e.target.value)} className="mt-1 w-full p-3 border-none bg-white rounded-lg shadow-sm" rows="4"></textarea>
          </div>
        </div>
      );
    }

    return null;
  };

  const fetchBlocks = async () => {
    try {
      const res = await api.get('/cms');
      setBlocks(res.data);
    } catch (err) {
      toast.error('Failed to load CMS blocks');
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (currentBlock._id) {
        await api.put(`/cms/${currentBlock._id}`, currentBlock);
        toast.success('Block updated');
      } else {
        await api.post('/cms', currentBlock);
        toast.success('Block created');
      }
      setIsEditing(false);
      fetchBlocks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save block');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this block?')) return;
    try {
      await api.delete(`/cms/${id}`);
      toast.success('Block deleted');
      fetchBlocks();
    } catch (err) {
      toast.error('Failed to delete block');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="page-shell flex-1 py-12">
        <div className="space-y-6">
          <AdminHeader 
        title="Page Builder (CMS)" 
        description="Design your homepage dynamically by adding and arranging content blocks."
        actions={
          <button onClick={() => { setCurrentBlock({ type: 'HeroSlider', title: '', content: {}, sortOrder: 0, isActive: true }); setIsEditing(true); }} className="bg-white text-emerald-600 px-4 py-2 rounded-lg font-bold shadow-md hover:bg-emerald-50 transition-colors">
            + Add New Block
          </button>
        }
      />

      {isEditing ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold mb-4">{currentBlock._id ? 'Edit Block' : 'New Block'}</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Block Title (Internal)</label>
              <input type="text" value={currentBlock.title} onChange={e => setCurrentBlock({...currentBlock, title: e.target.value})} className="mt-1 w-full p-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Block Type</label>
              <select value={currentBlock.type} onChange={e => setCurrentBlock({...currentBlock, type: e.target.value})} className="mt-1 w-full p-2 border rounded-lg">
                <option value="IntroSection">Main Introduction Section</option>
                <option value="ProgramsSection">Programs List Section</option>
                <option value="PricingSection">Pricing Plans Section</option>
                <option value="CTASection">Call To Action Section</option>
                <option value="HeroSlider">Hero Slider</option>
                <option value="VideoBlock">Video Block</option>
                <option value="ImageBanner">Image Banner</option>
                <option value="TextSection">Text Section</option>
              </select>
            </div>
            {renderContentFields()}
            <div>
              <label className="block text-sm font-medium text-slate-700">Sort Order (Lower appears first)</label>
              <input type="number" value={currentBlock.sortOrder} onChange={e => setCurrentBlock({...currentBlock, sortOrder: Number(e.target.value)})} className="mt-1 w-full p-2 border rounded-lg" />
            </div>
            
            <div className="pt-4 flex gap-2">
              <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg">Save Block</button>
              <button type="button" onClick={() => setIsEditing(false)} className="bg-slate-200 px-4 py-2 rounded-lg">Cancel</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid gap-4">
          {blocks.map(block => (
            <div key={block._id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">{block.title}</h3>
                <p className="text-sm text-slate-500">Type: {block.type} | Order: {block.sortOrder} | Status: {block.isActive ? 'Active' : 'Hidden'}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setCurrentBlock(block); setIsEditing(true); }} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg">Edit</button>
                <button onClick={() => handleDelete(block._id)} className="px-3 py-1 bg-rose-100 text-rose-700 rounded-lg">Delete</button>
              </div>
            </div>
          ))}
          {blocks.length === 0 && <p className="text-slate-500 text-center py-8">No homepage blocks created yet.</p>}
        </div>
      )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
