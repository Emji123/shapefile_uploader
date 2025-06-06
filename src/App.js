import React from 'react';
import ShapefileForm from './ShapefileForm';
import ShapefileUpsaForm from './ShapefileUpsaForm';
import ShapefileBitproForm from './ShapefileBitproForm';
import ShapefileMataAirForm from './ShapefileMataAirForm';
import ShapefilePenghijauanForm from './ShapefilePenghijauanForm';
import Keterangan from './Keterangan';
import './App.css';
import './ShapefileForm.css'; // Import CSS untuk subheader

function App() {
  return (
    <div className="app-container">
      <div className="form-container"> {/* Pakai form-container untuk konsistensi */}
        <h1>Form Upload Data Spasial Direktorat PPTH</h1>
        <p className="subheader">(Silakan baca keterangan terlebih dahulu di bagian paling bawah)</p>
      </div>
      <ShapefileForm />
      <ShapefileUpsaForm />
      <ShapefileBitproForm />
      <ShapefileMataAirForm />
      <ShapefilePenghijauanForm />
      <Keterangan />
    </div>
  );
}

export default App;