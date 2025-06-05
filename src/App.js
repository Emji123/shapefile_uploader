import React from 'react';
import ShapefileForm from './ShapefileForm';
import ShapefileUpsaForm from './ShapefileUpsaForm';
import ShapefileBitproForm from './ShapefileBitproForm';
import ShapefileMataAirForm from './ShapefileMataAirForm';
import ShapefilePenghijauanForm from './ShapefilePenghijauanForm';
import Keterangan from './Keterangan';
import './App.css';

function App() {
  return (
    <div className="app-container">
      <h1>Form Upload Data Spasial Direktorat PPTH</h1>
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