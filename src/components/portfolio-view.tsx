'use client';
import { useId, useRef, useState } from 'react';
import { coverWork, phoneLinks, serviceList, type Profile } from '@/lib/portfolio';
import { Icon } from './icon';
import './portfolio.css';

export function PortfolioView({ profile: p }: { profile: Profile }) {
  const cover = coverWork(p); const services = serviceList(p); const contact = p.showContact && !!p.phone;
  const links = phoneLinks(p.phone); const id = useId();
  const dialog = useRef<HTMLDialogElement>(null); const [selected, setSelected] = useState(0);
  const current = p.works[selected];
  function openPhoto(index: number) { setSelected(index); dialog.current?.showModal(); }
  return <article className="identity">
    <nav className="identity-nav" aria-label="Explorer ce portfolio">
      <a className="identity-brand" href={`#${id}-about`}><span>{p.name.charAt(0).toLocaleUpperCase('fr')}</span>{p.name}</a>
      <div><a href={`#${id}-services`}>Prestations</a><a href={`#${id}-works`}>Réalisations</a>{contact && <a className="identity-nav-contact" href={links.tel}>Me contacter<Icon name="arrow" size={15}/></a>}</div>
    </nav>
    <header className="identity-hero">
      <div className="identity-hero-copy"><span className="identity-kicker">LE SAVOIR-FAIRE A UN VISAGE</span><span className="identity-profession">{p.job}</span><h1>{p.name}</h1><p className="identity-tagline">{p.tagline || 'Mon travail, mon histoire, mes créations.'}</p><p className="identity-location"><Icon name="location" size={17}/>{p.city}</p>
        <div className="identity-hero-actions">{contact ? <a className="identity-cta" href={links.whatsapp || links.tel} target={links.whatsapp ? '_blank' : undefined} rel="noopener noreferrer"><Icon name="message" size={18}/>Parlons de votre projet<Icon name="arrow" size={17}/></a> : <a className="identity-cta" href={`#${id}-works`}>Découvrir mes réalisations<Icon name="arrow" size={17}/></a>}</div><span className="identity-hero-bottom">UN UNIVERS À DÉCOUVRIR <span>↓</span></span>
      </div>
      <div className="identity-hero-photo">{cover && <button onClick={() => openPhoto(p.works.findIndex(w => w.id === cover.id))} aria-label={`Agrandir : ${cover.title}`}><img src={cover.image} alt={cover.title}/><span><Icon name="expand" size={17}/></span></button>}<div className="identity-photo-label"><span>UNE CRÉATION DE</span><strong>{p.name}</strong></div><span className="identity-photo-count">01 / {String(p.works.length).padStart(2, '0')}</span></div>
    </header>
    <div className="identity-content">
      <section id={`${id}-about`} className="identity-about"><div className="identity-section-label"><span>01 — L’ATELIER</span><h2>{p.owner ? <>Derrière chaque création,<br/><em>{p.owner}.</em></> : <>Une histoire de<br/><em>savoir-faire.</em></>}</h2></div><div><p className="identity-bio">{p.bio}</p><dl className="identity-facts"><div><dt><Icon name="location" size={16}/>Mon atelier</dt><dd>{p.city}</dd></div>{p.experience && <div><dt><Icon name="spark" size={16}/>Mon parcours</dt><dd>{p.experience}</dd></div>}{p.availability && <div><dt><Icon name="clock" size={16}/>Mes disponibilités</dt><dd>{p.availability}</dd></div>}</dl></div></section>
      <section id={`${id}-services`} className="identity-services"><div className="identity-section-heading"><div><span>02 — MES PRESTATIONS</span><h2>Ce que je crée <em>pour vous.</em></h2></div><p>Des prestations à découvrir.<br/>Un projet à imaginer ensemble.</p></div><div className="identity-service-list">{services.map((service, index) => <div key={index}><span>{String(index + 1).padStart(2, '0')}</span><h3>{service}</h3><Icon name="arrow" size={21}/></div>)}</div></section>
      <section id={`${id}-works`} className="identity-works"><div className="identity-section-heading"><div><span>03 — MES RÉALISATIONS</span><h2>Le talent, <em>en images.</em></h2></div><p>Une sélection de mon travail.<br/>Touchez une photo pour l’agrandir.</p></div><div className="identity-gallery">{p.works.map((work, index) => <figure key={work.id}><button onClick={() => openPhoto(index)} aria-label={`Voir en grand : ${work.title}`}><img src={work.image} alt={work.title} loading="lazy"/><span><Icon name="expand" size={19}/></span></button><figcaption><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{work.title}</h3>{work.description && <p>{work.description}</p>}</div></figcaption></figure>)}</div></section>
      {contact && <section className="identity-contact" id={`${id}-contact`}><span>ET SI ON CRÉAIT QUELQUE CHOSE ENSEMBLE ?</span><h2>Votre prochaine idée<br/><em>commence par un échange.</em></h2><div><a className="identity-cta" href={links.tel}><Icon name="phone" size={19}/>{p.phone}</a>{links.whatsapp && <a className="identity-whatsapp" href={links.whatsapp} target="_blank" rel="noopener noreferrer"><Icon name="message" size={19}/>Écrire sur WhatsApp<Icon name="arrow" size={17}/></a>}</div>{p.availability && <p>{p.availability}</p>}</section>}
      <footer className="identity-footer"><div><strong>{p.name}</strong><span>{p.job} · {p.city}</span></div><div><span>Une vitrine créée avec <b>talentproof.</b></span><small>Informations et réalisations fournies par l’artisane.</small></div></footer>
    </div>
    <dialog className="identity-lightbox" ref={dialog} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }} aria-label="Réalisation en grand">
      {current && <div><button className="lightbox-close" autoFocus onClick={() => dialog.current?.close()} aria-label="Fermer la photo"><Icon name="close" size={23}/></button><img src={current.image} alt={current.title}/><div className="lightbox-caption"><div><h2>{current.title}</h2>{current.description && <p>{current.description}</p>}</div><span>{selected + 1} / {p.works.length}</span></div>{p.works.length > 1 && <div className="lightbox-controls"><button onClick={() => setSelected((selected - 1 + p.works.length) % p.works.length)} aria-label="Photo précédente"><Icon name="back"/></button><button onClick={() => setSelected((selected + 1) % p.works.length)} aria-label="Photo suivante"><Icon name="arrow"/></button></div>}</div>}
    </dialog>
  </article>;
}
