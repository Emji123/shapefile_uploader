import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import JSZip from 'jszip';
import { openDbf } from 'shapefile';
import './ShapefileForm.css';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

const ShapefileUpsaForm = () => {
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
    console.log('File dipilih (Persemaian):', selectedFile ? selectedFile.name : 'Tidak ada file');
    setFile(selectedFile);
    setError('');
    setSuccess('');
  };

  const validateZip = async (zipFile) => {
    try {
      console.log('Validasi ZIP (Persemaian):', zipFile.name);
      const zip = new JSZip();
      const content = await zip.loadAsync(zipFile);
      const files = Object.keys(content.files);
      console.log('File di ZIP:', files);

      const shpFiles = files.filter(name => name.toLowerCase().endsWith('.shp'));
      if (shpFiles.length === 0) {
        return { valid: false, error: 'File ZIP harus berisi setidaknya satu file .shp.' };
      }

      const successMessages = [];
      const errorMessages = [];
      let shapefileIndex = 0;
      let validShapefileCount = 0;

      for (const shpFile of shpFiles) {
        shapefileIndex++;
        const baseName = shpFile.substring(0, shpFile.length - 4).toLowerCase();
        console.log('Memvalidasi shapefile:', baseName);

        const shxFile = files.find(name => name.toLowerCase() === `${baseName}.shx`);
        const dbfFile = files.find(name => name.toLowerCase() === `${baseName}.dbf`);

        if (!shxFile || !dbfFile) {
          errorMessages.push(`${shapefileIndex}. Pada shapefile ${baseName} yang belum lengkap:\n    - Harus memiliki .shp, .shx, dan .dbf`);
          continue;
        }

        const dbfContent = await content.file(dbfFile).async('arraybuffer');
        const source = await openDbf(dbfContent);
        console.log('Membuka .dbf:', dbfFile);

        let missingFields = new Set();
        let emptyFieldsMap = new Map();
        let featureCount = 0;

        let result;
        do {
          result = await source.read();
          console.log('Fitur:', result);
          if (result.done) break;

          featureCount++;
          const feature = result.value;
          if (!feature) {
            errorMessages.push(`${shapefileIndex}. Pada shapefile ${baseName} yang belum lengkap:\n    - Baris ke-${featureCount} tidak valid`);
            break;
          }

          const properties = feature.properties || feature;
          if (!properties || typeof properties !== 'object') {
            errorMessages.push(`${shapefileIndex}. Pada shapefile ${baseName} yang belum lengkap:\n    - Baris ke-${featureCount} tidak memiliki properti valid`);
            break;
          }
          console.log('Properti fitur:', properties);

          for (const field of requiredFields) {
            if (!(field in properties)) {
              missingFields.add(field);
            } else {
              const value = properties[field];
              if (value === null || value === '') {
                if (!emptyFieldsMap.has(field)) {
                  emptyFieldsMap.set(field, []);
                }
                emptyFieldsMap.get(field).push(featureCount);
              }
            }
          }
        } while (!result.done);

        if (featureCount === 0) {
          errorMessages.push(`${shapefileIndex}. Pada shapefile ${baseName} yang belum lengkap:\n    - File tidak memiliki baris data`);
          continue;
        }

        let shapefileErrors = [];
        if (missingFields.size > 0 || emptyFieldsMap.size > 0) {
          shapefileErrors.push(`${shapefileIndex}. Pada shapefile ${baseName} yang belum lengkap:`);
          if (missingFields.size > 0) {
            shapefileErrors.push(`    a. Field yang belum ada yaitu:`);
            Array.from(missingFields).forEach(field => {
              shapefileErrors.push(`         - ${field}`);
            });
          }
          if (emptyFieldsMap.size > 0) {
            shapefileErrors.push(`    b. Field yang datanya belum diisi/kosong:`);
            emptyFieldsMap.forEach((rows, field) => {
              shapefileErrors.push(`         - ${field}, pada baris: ${rows.join(',')}`);
            });
          }
          errorMessages.push(shapefileErrors.join('\n'));
        } else {
          successMessages.push(`${shapefileIndex}. Pada shapefile ${baseName} sudah lengkap`);
          validShapefileCount++;
        }
      }

      if (validShapefileCount === shpFiles.length) {
        return { valid: true, success: 'Data sudah valid dan berhasil diunggah' };
      } else {
        let combinedMessage = [];
        if (successMessages.length > 0) {
          combinedMessage.push(successMessages.join('\n'));
        }
        if (errorMessages.length > 0) {
          combinedMessage.push(errorMessages.join('\n'));
        }
        combinedMessage.push('Perbaiki shapefile dan upload ulang');
        return { valid: false, error: combinedMessage.join('\n') };
      }
    } catch (err) {
      console.error('Error validasi ZIP (Persemaian):', err);
      return { valid: false, error: `Gagal memvalidasi ZIP: ${err.message}\nPerbaiki shapefile dan upload ulang` };
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
      console.log('Mengunggah ke:', { bucket: 'persemaian', filePath });

      const { data: uploadData, error: fileError } = await supabase.storage
        .from('persemaian')
        .upload(filePath, file, { upsert: true });

      if (fileError) {
        console.error('Upload error:', fileError);
        setError('Gagal mengunggah: ' + fileError.message);
        setIsUploading(false);
        return;
      }
      console.log('Upload sukses:', uploadData);

      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      console.log('Mengirim ke backend:', { zip_path: filePath, bucket: 'persemaian' });
      const response = await fetch(`${BACKEND_URL}/upload-shapefile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip_path: filePath, bucket: 'persemaian' })
      });

      const result = await response.json();
      console.log('Respons backend:', result);

      if (!response.ok) {
        console.error('Backend error:', result);
        setError(result.error || 'Gagal memvalidasi shapefile.');
        await supabase.storage.from('persemaian').remove([filePath]);
        setIsUploading(false);
        return;
      }

      setSuccess(validation.success);
      setFile(null);
      document.getElementById('shapefileUpsaInput').value = '';
    } catch (err) {
      console.error('Error umum:', err);
      setError('Terjadi kesalahan: ' + err.message);
      if (filePath) {
        await supabase.storage.from('persemaian').remove([filePath]);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Upload Shapefile Penanaman Bibit Persemaian</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      {isUploading && <p className="uploading">Sedang mengunggah shapefile...</p>}
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="shapefileUpsaInput" className="file-input-label">
            Pilih File .zip Persemaian
          </label>
          <input
            type="file"
            id="shapefileUpsaInput"
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

export default ShapefileUpsaForm;