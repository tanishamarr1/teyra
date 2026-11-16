import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("Error de interfaz:", error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="auth">
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 10 }}>Algo salió mal</h1>
          <p className="mu">Ocurrió un error inesperado. Tus datos guardados están a salvo.</p>
          <button className="btn" style={{ marginTop: 16 }} onClick={() => window.location.reload()}>Recargar</button>
        </div>
      </div>
    );
  }
}
