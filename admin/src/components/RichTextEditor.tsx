import React, { useRef, useEffect, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { Box, CircularProgress } from '@mui/material';
import api from '../services/api';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder = 'Start writing...' }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const [uploading, setUploading] = useState(false);

  // Upload file function
  const uploadFile = async (file: File, type: 'image' | 'video') => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('admin_token');
      const response = await api.post('/api/admin/blogs/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.data.status && response.data.data) {
        const url = response.data.data.url;
        const quill = quillRef.current;
        if (!quill) return;

        const range = quill.getSelection(true);
        const index = range ? range.index : quill.getLength();
        
        if (type === 'image') {
          quill.insertEmbed(index, 'image', url);
        } else if (type === 'video') {
          quill.insertEmbed(index, 'video', url);
        }
        
        quill.setSelection(index + 1, 0);
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('File upload error:', error);
      alert(error.response?.data?.message || 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Image handler
  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      await uploadFile(file, 'image');
    };
  };

  // Video handler
  const videoHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'video/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      await uploadFile(file, 'video');
    };
  };

  useEffect(() => {
    if (!editorRef.current || quillRef.current) return;

    // Initialize Quill
    const quill = new Quill(editorRef.current, {
      theme: 'snow',
      placeholder,
      modules: {
        toolbar: {
          container: [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            [{ 'font': [] }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
            [{ 'script': 'sub'}, { 'script': 'super' }],
            [{ 'direction': 'rtl' }],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }],
            ['link', 'image', 'video'],
            ['clean'],
            ['code-block']
          ],
          handlers: {
            image: imageHandler,
            video: videoHandler,
          },
        },
        clipboard: {
          matchVisual: false,
        },
      },
      formats: [
        'header', 'font', 'size',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'bullet', 'indent',
        'script', 'direction',
        'color', 'background',
        'align',
        'link', 'image', 'video',
        'code-block'
      ],
    });

    quillRef.current = quill;

    // Set initial content
    if (value) {
      quill.root.innerHTML = value;
    }

    // Listen for text changes
    quill.on('text-change', () => {
      const content = quill.root.innerHTML;
      onChange(content);
    });

    return () => {
      quill.off('text-change');
    };
  }, []);

  // Update content when value prop changes (but not from internal changes)
  useEffect(() => {
    if (quillRef.current && quillRef.current.root.innerHTML !== value) {
      const selection = quillRef.current.getSelection();
      quillRef.current.root.innerHTML = value;
      if (selection) {
        quillRef.current.setSelection(selection);
      }
    }
  }, [value]);

  return (
    <Box sx={{ position: 'relative' }}>
      {uploading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 1000,
            borderRadius: 1,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      <Box
        ref={editorRef}
        sx={{
          backgroundColor: 'white',
          minHeight: '400px',
          '& .ql-editor': {
            minHeight: '400px',
            fontSize: '16px',
            lineHeight: 1.6,
            fontFamily: "'Josefin Sans', Arial, Helvetica, sans-serif",
          },
          '& .ql-editor.ql-blank::before': {
            fontStyle: 'normal',
            color: '#999',
          },
          '& .ql-container': {
            fontFamily: "'Josefin Sans', Arial, Helvetica, sans-serif",
          },
          '& .ql-snow .ql-picker': {
            color: '#333',
          },
          '& .ql-snow .ql-stroke': {
            stroke: '#333',
          },
          '& .ql-snow .ql-fill': {
            fill: '#333',
          },
        }}
      />
    </Box>
  );
};

export default RichTextEditor;
