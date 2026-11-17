// Presenta en la portada los servicios activos que administra el panel.
import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api.js';

// Carga y dibuja las tarjetas públicas de servicios con su estimación opcional.
export default function ManagedServices() {
  const [services, setServices] = useState([]);

  // Solicita el catálogo público al montar la portada.
  useEffect(() => {
    let active = true;
    apiFetch('/services').then(items => { if (active) setServices(items); }).catch(() => {});
    return () => { active = false; };
  }, []);

  if (!services.length) return null;
  return <div className="service-list managed-service-list" aria-label="Servicios adicionales">
    {services.map((service, index) => <article className={`service-card${index % 2 ? ' service-card--green' : ''}`} key={service._id}>
      <div className={`service-card__icon ${index % 2 ? 'service-card__icon--green' : 'service-card__icon--cyan'}`} aria-hidden="true">{index % 2 ? '⚙' : '⌁'}</div>
      <p className="service-card__category">{service.category}</p>
      <h3 className="service-card__title">{service.name}</h3>
      <p>{service.description}</p>
      {service.estimatedTime && <p className="service-card__features">Tiempo estimado: {service.estimatedTime}</p>}
    </article>)}
  </div>;
}
