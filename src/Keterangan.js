import React from 'react';
import './Keterangan.css';

const Keterangan = () => {
  return (
    <div className="keterangan-container">
      <h3>Keterangan:</h3>
      <div className="keterangan-box">
        <ol className="keterangan-list">
          <li>Format shapefile mengacu pada Nota Dinas Direktur yang berlaku. Ketidaksesuaian nama field dan/atau tidak tersedianya salah satu field dapat menyebabkan eror saat proses upload.</li>
          <li>Semua field harus terisi datanya, jika memang tidak ada datanya silakan isi dengan "NO DATA". Khusus untuk field "LUAS_HA" dan "BTG_TOTAL" agar semuanya diisi dengan nilai yang sesuai.</li>
          <li>
            Shapefile dikemas dalam file berekstensi .zip dan dalam satu file zip dapat terdiri dari beberapa file shp yang berbeda (misalnya shp tahun 2019, 2020, 2022 dst dalam satu file .zip). 
            Format penamaan file .zip dapat mengikuti format "BPDAS_JENISKEGIATAN.zip", contohnya sebagai berikut:
            <ul>
              <li>"WAMPU_SEI_ULAR_KBR.zip" untuk kegiatan penanaman bibit KBR,</li>
              <li>"WAMPU_SEI_ULAR_PERSEMAIAN.zip" untuk kegiatan penanaman bibit persemaian,</li>
              <li>"WAMPU_SEI_ULAR_bitpro.zip" untuk kegiatan penanaman bibit produktif, dan</li>
              <li>"WAMPU_SEI_ULAR_MATAAIR.zip" untuk kegiatan penanaman imbuahan mata air.</li>
            </ul>
            Format penamaan file .shp mengikuti format "BPDAS_JENISKEGIATAN_TAHUNKEGIATAN.shp", contohnya "WAMPU_SEI_ULAR_KBR_2025.shp".
          </li>
          <li>Hindari menempatkan file-file tersebut dalam folder maupun subfolder karena akan menyebabkan eror dalam proses upload.</li>
          <li>Shapefile wajib dibuat menggunakan proyeksi geografis datum WGS1984.</li>
          <li>Infokan ke PIC terkait jika selesai mengupload data. Jika ada kendala terkait proses upload, silakan berkoordinasi dengan PIC terkait.</li>
        </ol>
      </div>
    </div>
  );
};

export default Keterangan;