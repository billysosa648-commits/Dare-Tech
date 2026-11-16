// Presenta el punto de entrada React mientras se migra el panel en la fase siguiente.
import AppHeader from '../components/AppHeader.jsx';

// Muestra el estado del andamiaje sin reemplazar todavía el panel actual.
export default function AdminScaffold() {
  return (
    <main id="main-content" className="react-admin-scaffold">
      <AppHeader />
      <section className="react-admin-scaffold__panel" aria-labelledby="scaffold-title">
        <p className="react-admin-scaffold__eyebrow">Entorno de migración</p>
        <h1 id="scaffold-title">React está listo para Dare-Tech</h1>
        <p>El panel actual sigue disponible en <a href="admin.html">admin.html</a>. En la siguiente fase se conectarán aquí el acceso y las herramientas administrativas.</p>
      </section>
    </main>
  );
}
