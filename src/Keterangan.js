import React from 'react';
import './Keterangan.css';

const Keterangan = () => {
  return (
    <div className="keterangan-container">
      <h3>Keterangan:</h3>
      <ol>
        <li>Format shapefile mengacu pada Nota Dinas Direktur yang berlaku. Ketidaksesuaian nama field dan/atau tidak tersedianya salah satu field dapat menyebabkan eror saat proses upload.</li>
        <li>Semua field harus terisi datanya, jika memang tidak ada datanya silakan isi dengan "TIDAK TERSEDIA".</li>
        <li>Shapefile wajib dikemas dalam file berekstensi .zip dan dalam satu file zip dapat terdiri dari beberapa file shp yang berbeda (misalnya shp tahun 2019, 2020, 2022 dst dalam satu file .zip). Sebagai contoh untuk format nama file .zip "WAMPU_SEI_ULAR_INTENSIF_AGRO.zip" untuk kegiatan RHL intensif dan/atau agroforestry (silakan digabung saja dalam satu tahun kegiatan shp agro dan intensif ke dalam satu file .shp), "WAMPU_SEI_ULAR_UPSA.zip" untuk kegiatan pembangunan UPSA.</li>
        <li>Hindari menempatkan file-file tersebut dalam folder maupun subfolder karena akan menyebabkan eror dalam proses upload.</li>
        <li>Shapefile wajib dibuat menggunakan proyeksi geografis datum WGS1984.</li>
        <li>Infokan ke PIC terkait jika selesai mengupload data. Jika ada kendala terkait proses upload, silakan berkoordinasi dengan PIC terkait.</li>
      </ol>
    </div>
  );
};

export default Keterangan;