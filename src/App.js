import React from 'react';
import ShapefileForm from './ShapefileForm';
import ShapefileUpsaForm from './ShapefileUpsaForm';
import Keterangan from './Keterangan';
import './App.css';

function App() {
  return (
    <div className="app-container">
      <ShapefileForm />
      <ShapefileUpsaForm />
      <Keterangan />
    </div>
  );
}

export default App;