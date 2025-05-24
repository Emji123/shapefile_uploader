import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import JSZip from 'jszip';
import { openDbf } from 'shapefile';
import './ShapefileForm.css';

const ShapefileUpsaForm = () => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const requiredFields = [
    'ID', 'BPDAS', 'UR_BPDAS', 'WADMPR', 'WADMKK', 'WADMKC', 'DESA',
    'KELOMPOK', 'THN_BUAT', 'LUAS_HA', 'JENIS_TNM', 'BTG_TOTAL',
    'BTG_HA', 'SPL_TEKNIS', 'FUNGSI_KWS', 'KET'
  ];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    console.log('File dipilih (UPSA):', selectedFile ? selectedFile.name : 'Tidak ada file');
    setFile(selectedFile);
    setError('');
    setSuccess('');
  };

  const validateZip = async (zipFile) => {
    try {
      console.log('Validasi ZIP (UPSA):', zipFile.name);
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
            errorMessages.push(`- Fitur ke-${featureCount} tidak valid di ${dbfFile}.`);
            break;
          }

          const properties = feature.properties || feature;
          if (!properties || typeof properties !== 'object') {
            errorMessages.push(`- Fitur ke-${featureCount} tidak memiliki properti valid di ${dbfFile}.`);
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
            emptyFields.push(`Fitur ke-${featureCount}: ${emptyInFeature.join(', ')}`);
          }
        } while (!result.done);

        if (featureCount === 0) {
          errorMessages.push(`- File ${dbfFile} tidak memiliki fitur.`);
          continue;
        }

        if (missingFields.size > 0) {
          errorMessages.push(`- Field hilang di ${dbfFile}: ${Array.from(missingFields).join(', ')}.`);
        }
        if (emptyFields.length > 0) {
          errorMessages.push(`- Field kosong di ${dbfFile}: ${emptyFields.join('; ')}.`);
        }
      }

      if (errorMessages.length > 0) {
        return { valid: false, error: errorMessages.join('\n') };
      }

      return { valid: true };
    } catch (err) {
      console.error('Error validasi ZIP (UPSA):', err);
      return { valid: false, error: `Gagal memvalidasi ZIP: ${err.message}` };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsUploading(true);

    if (!file) {
      setError('File shapefile (ZIP) wajib diunggah!');
      setIsUploading(false);
      return;
    }

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('File harus berupa ZIP yang berisi shapefile!');
      setIsUploading(false);
      return;
    }

    const validation = await validateZip(file);
    if (!validation.valid) {
      setError(validation.error);
      setIsUploading(false);
      return;
    }

    const filePath = `shapefiles/${file.name}`;
    const { error: fileError } = await supabase.storage
      .from('shapefileUploads')
      .upload(filePath, file, { upsert: true });

    if (fileError) {
      setError('Gagal mengunggah shapefile: ' + fileError.message);
      setIsUploading(false);
      return;
    }

    try {
      console.log('Mengirim ke server (UPSA):', filePath);
      const response = await fetch('http://localhost:3001/validate-shapefile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip_path: filePath })
      });

      const text = await response.text();
      console.log('Respons server:', text);
      try {
        const validationData = JSON.parse(text);
        if (!response.ok || validationData.error) {
          setError(validationData.error || 'Validasi shapefile gagal!');
          await supabase.storage.from('shapefileUploads').remove([filePath]);
          setIsUploading(false);
          return;
        }

        setSuccess('Shapefile berhasil diunggah dan divalidasi!');
        setFile(null);
        document.getElementById('shapefileUpsaInput').value = '';
        setIsUploading(false);
      } catch (jsonError) {
        setError('Error parsing JSON: ' + jsonError.message + ' (Server mengembalikan: ' + text.substring(0, 100) + ')');
        await supabase.storage.from('shapefileUploads').remove([filePath]);
        setIsUploading(false);
      }
    } catch (err) {
      setError('Error saat validasi: ' + err.message);
      await supabase.storage.from('shapefileUploads').remove([filePath]);
      setIsUploading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Upload Shapefile UPSA</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      {isUploading && <p className="uploading">Sedang mengunggah shapefile...</p>}
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="shapefileUpsaInput" className="file-input-label">
            Pilih File SHP UPSA
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