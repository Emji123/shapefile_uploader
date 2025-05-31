import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import JSZip from 'jszip';
import { openDbf } from 'shapefile';
import './ShapefileForm.css';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

const ShapefileMataAirForm = () => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const requiredFields = [
    'ID', 'BPDAS', 'UR_BPDAS', 'WADMPR', 'WADMKK', 'WADMKC', 'DESA',
    'KELOMPOK', 'LUAS_HA', 'JENIS_TNM', 'BTG_TOTAL', 'THN_BUAT',
    'THN_TNM', 'FUNGSI_KWS'
  ];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    console.log('File dipilih (Mata Air):', selectedFile ? selectedFile.name : 'Tidak ada file');
    setFile(selectedFile);
    setError('');
    setSuccess('');
  };

  const validateZip = async (zipFile) => {
    try {
      console.log('Validasi ZIP (Mata Air):', zipFile.name);
      const zip = new JSZip();
      const content = await zip.loadAsync(zipFile);
      const files = Object.keys(content.files);
      console.log('File di ZIP:', files);

      const shpFiles = files.filter(name => name.toLowerCase().endsWith('.shp'));
      if (shpFiles.length === 0) {
        return { valid: false, error: 'File ZIP harus berisi setidaknya satu file .shp.' };
      }

      const errorMessages = [];

      for (const shpFile of shpFiles) {
        const baseName = shpFile.substring(0, shpFile.length - 4).toLowerCase();
        console.log('Memvalidasi shapefile:', baseName);

        const shxFile = files.find(name => name.toLowerCase() === `${baseName}.shx`);
        const dbfFile = files.find(name => name.toLowerCase() === `${baseName}.dbf`);

        if (!shxFile || !dbfFile) {
          errorMessages.push(`- Shapefile ${baseName} tidak lengkap: harus memiliki .shp, .shx, dan .dbf.`);
          continue;
        }

        const dbfContent = await content.file(dbfFile).async('arraybuffer');
        const source = await openDbf(dbfContent);
        console.log('Membuka .dbf:', dbfFile);

        let missingFields = new Set();
        let emptyFields = [];
        let featureCount = 0;

        let result;
        do {
          result = await source.read();
          console.log('Fitur:', result);
          if (result.done) break;

          featureCount++;
          const feature = result.value;
          if (!feature) {
            errorMessages.push(`- Baris ke-${featureCount} tidak valid di ${dbfFile}.`);
            break;
          }

          const properties = feature.properties || feature;
          if (!properties || typeof properties !== 'object') {
            errorMessages.push(`- Baris ke-${featureCount} tidak memiliki properti valid di ${dbfFile}.`);
            break;
          }
          console.log('Properti fitur:', properties);

          requiredFields.forEach(field => {
            if (!(field in properties)) {
              missingFields.add(field);
            }
          });

          let emptyInFeature = [];
          requiredFields.forEach(field => {
            if (field in properties) {
              const value = properties[field];
              if (value === null || value === '') {
                emptyInFeature.push(field);
              }
            }
          });
          if (emptyInFeature.length > 0) {
            emptyFields.push(`Baris ke-${featureCount} pada field: ${emptyInFeature.join(', ')}`);
          }
        } while (!result.done);

        if (featureCount === 0) {
          errorMessages.push(`- File ${dbfFile} tidak memiliki baris data.`);
          continue;
        }

        if (missingFields.size > 0) {
          errorMessages.push(`- Field belum ditambahkan di ${dbfFile}: ${Array.from(missingFields).join(', ')}.`);
        }
        if (emptyFields.length > 0) {
          errorMessages.push(`- Field belum diisi di ${dbfFile}: ${emptyFields.join('; ')}.`);
        }
      }

      if (errorMessages.length > 0) {
        return { valid: false, error: errorMessages.join('\n') };
      }

      return { valid: true };
    } catch (err) {
      console.error('Error validasi ZIP (Mata Air):', err);
      return { valid: false, error: `Gagal memvalidasi ZIP: ${err.message}` };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsUploading(true);

    if (!file) {
      console.log('Tidak ada file dipilih');
      setError('Pilih file ZIP terlebih dahulu!');
      setIsUploading(false);
      return;
    }

    console.log('Memulai validasi file:', file.name);
    const validation = await validateZip(file);
    if (!validation.valid) {
      console.error('Validasi gagal:', validation.error);
      setError(validation.error);
      setIsUploading(false);
      return;
    }

    let filePath = '';
    try {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      console.log('Waktu lokal:', now.toString());
      const dateString = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '_').toUpperCase();
      const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/[:.]/g, '');
      const fileNameWithDate = `${dateString}_${timeString}_${file.name}`;
      filePath = `shapefiles/${fileNameWithDate}`;
      console.log('Mengunggah ke:', { bucket: 'mataair', filePath });

      const { data: uploadData, error: fileError } = await supabase.storage
        .from('mataair')
        .upload(filePath, file, { upsert: true });

      if (fileError) {
        console.error('Upload error:', fileError);
        setError('Gagal mengunggah: ' + fileError.message);
        setIsUploading(false);
        return;
      }
      console.log('Upload sukses:', uploadData);

      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      console.log('Mengirim ke backend:', { zip_path: filePath, bucket: 'mataair' });
      const response = await fetch(`${BACKEND_URL}/validate-shapefile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip_path: filePath, bucket: 'mataair' })
      });

      const result = await response.json();
      console.log('Respons backend:', result);

      if (!response.ok) {
        console.error('Backend error:', result);
        setError(result.error || 'Gagal memvalidasi shapefile.');
        await supabase.storage.from('mataair').remove([filePath]);
        setIsUploading(false);
        return;
      }

      setSuccess('Shapefile berhasil diunggah dan divalidasi!');
      setFile(null);
      document.getElementById('shapefileMataAirInput').value = '';
    } catch (err) {
      console.error('Error umum:', err);
      setError('Terjadi kesalahan: ' + err.message);
      if (filePath) {
        await supabase.storage.from('mataair').remove([filePath]);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Upload Shapefile Penanaman Imbuhan Mata Air</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      {isUploading && <p className="uploading">Sedang mengunggah shapefile...</p>}
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="shapefileMataAirInput" className="file-input-label">
            Pilih File .zip Mata Air
          </label>
          <input
            type="file"
            id="shapefileMataAirInput"
            name="shapefile"
            onChange={handleFileChange}
            accept=".zip"
            required
            disabled={isUploading}
            className="file-input"
          />
          <div className="file-name-box">
            {file ? file.name : 'Tidak ada file dipilih'}
          </div>
          <button type="submit" disabled={isUploading}>Unggah</button>
        </div>
      </form>
    </div>
  );
};

export default ShapefileMataAirForm;