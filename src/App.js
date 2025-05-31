import React from 'react';
import ShapefileForm from './ShapefileForm';
import ShapefileUpsaForm from './ShapefileUpsaForm';
import ShapefileBitproForm from './ShapefileBitproForm';
import ShapefileMataAirForm from './ShapefileMataAirForm';
import Keterangan from './Keterangan';
import './App.css';

function App() {
  return (
    <div className="app-container">
      <ShapefileForm />
      <ShapefileUpsaForm />
      <ShapefileBitproForm />
      <ShapefileMataAirForm />
      <Keterangan />
    </div>
  );
}

export default App;