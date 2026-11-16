// Muestra la identidad y orientación principal del panel React.
export default function AppHeader() {
  return (
    <header className="react-admin-header">
      <a className="react-admin-header__brand" href="index.html">Dare-Tech<span aria-hidden="true">_</span></a>
      <span className="react-admin-header__label">Administración</span>
    </header>
  );
}
