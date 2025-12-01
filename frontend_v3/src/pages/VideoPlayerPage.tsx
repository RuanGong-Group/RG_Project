import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { videoService, VideoJob } from '../services/video.service';

export default function VideoPlayerPage() {
  const navigate = useNavigate();
  const [job, setJob] = useState<VideoJob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideo();
  }, []);

  const loadVideo = async () => {
    try {
      const { hasGenerated, job } = await videoService.getTodayVideo();
      if (!hasGenerated || !job) {
        alert('No video found for today');
        navigate('/today-plan');
        return;
      }
      setJob(job);
    } catch (e) {
      console.error(e);
      navigate('/today-plan');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ color: 'white', backgroundColor: 'black', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  if (!job) return null;

  // Construct URL
  // Assuming backend serves /api/static mapped to RG_data
  // And video is in RG_data/videos/
  // The filename is usually derived from jobId or stored in videoPath
  // If videoPath is absolute, we need to extract filename.
  const filename = job.videoPath ? job.videoPath.split(/[\\/]/).pop() : `daily_video_${job.jobId}.mp4`;
  // Base URL handling: if VITE_API_BASE_URL is http://localhost:3000/api, we want http://localhost:3000
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  const serverBase = apiBase.replace(/\/api$/, ''); 
  const videoUrl = job.videoUrl || `${serverBase}/api/static/videos/${filename}`;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'black',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <button 
        onClick={() => navigate('/today-plan')}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          padding: '10px 20px',
          backgroundColor: 'rgba(255,255,255,0.2)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          zIndex: 1001,
          backdropFilter: 'blur(4px)'
        }}
      >
        ← 返回
      </button>

      <video 
        src={videoUrl} 
        controls 
        autoPlay 
        style={{
          maxWidth: '100%',
          maxHeight: '80%',
          boxShadow: '0 0 50px rgba(0,0,0,0.5)'
        }}
      />

      {/* Word List Overlay */}
      {job.words && job.words.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: '15px',
          borderRadius: '10px',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          gap: '15px',
          maxWidth: '90%',
          overflowX: 'auto'
        }}>
          {job.words.map(w => (
            <div key={w.id} style={{ color: 'white', textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{w.word}</div>
              {w.pronunciation && (
                <div style={{ fontSize: '12px', color: '#ccc' }}>
                  {typeof w.pronunciation === 'string' ? w.pronunciation : (w.pronunciation.us || w.pronunciation.uk)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
