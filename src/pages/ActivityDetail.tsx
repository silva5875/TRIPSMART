import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Star, MapPin, Calendar, DollarSign, Compass, Navigation } from 'lucide-react';
import { pernambucoCities, spotsByCity, categoryLabels, monthNames } from '@/data/mockData';
import Seo from '@/components/Seo';

const ActivityDetail = () => {
  const { cityId, spotId } = useParams();
  const navigate = useNavigate();

  const city = pernambucoCities.find(c => c.id === cityId);
  const spots = spotsByCity[cityId || ''] || [];
  const spot = spots.find(s => s.id === spotId);

  if (!city || !spot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-muted-foreground mb-4">Atividade não encontrada</p>
          <Button onClick={() => navigate('/')} className="gradient-pe border-0 rounded-full text-primary-foreground">
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  const otherSpots = spots.filter(s => s.id !== spotId).slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${spot.name}, ${city.name} — TRIPSMART`}
        description={spot.description?.slice(0, 155) || `${spot.name} em ${city.name}, Pernambuco. Avaliação ${spot.rating}/5.`}
        path={`/#/atividade/${cityId}/${spotId}`}
        image={spot.imageUrl}
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "TouristAttraction",
          name: spot.name,
          description: spot.description,
          image: spot.imageUrl,
          address: {
            "@type": "PostalAddress",
            addressLocality: city.name,
            addressRegion: "PE",
            addressCountry: "BR",
          },
          geo: {
            "@type": "GeoCoordinates",
            latitude: spot.lat,
            longitude: spot.lng,
          },
          aggregateRating: spot.rating
            ? { "@type": "AggregateRating", ratingValue: spot.rating, bestRating: 5, ratingCount: 1 }
            : undefined,
        }}
      />
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl gradient-pe flex items-center justify-center">
              <Navigation size={20} className="text-primary-foreground" />
            </div>
            <span className="text-xl font-black tracking-tight">
              <span className="text-primary">TRIP</span><span className="text-accent">SMART</span>
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-1.5 text-xs font-bold">
            <ArrowLeft size={14} /> Voltar
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative">
        {spot.imageUrl ? (
          <img src={spot.imageUrl} alt={spot.name} className="w-full h-64 md:h-96 object-cover" />
        ) : (
          <div className="w-full h-64 md:h-96 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-9xl">
            {spot.imageEmoji}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="max-w-5xl mx-auto">
            {spot.category && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/20 text-primary backdrop-blur-sm">
                {categoryLabels[spot.category]}
              </span>
            )}
            <h1 className="text-3xl md:text-5xl font-black tracking-display text-foreground mt-3">{spot.name}</h1>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin size={16} className="text-primary" /> {city.name}
              </span>
              <span className="flex items-center gap-1 text-sm">
                <Star size={16} className="text-secondary fill-secondary" />
                <span className="font-bold text-foreground">{spot.rating}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main */}
          <div className="md:col-span-2 space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
              <h2 className="text-xl font-bold text-card-foreground mb-3">Sobre</h2>
              <p className="text-muted-foreground leading-relaxed">{spot.description}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 rounded-2xl border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
              <h2 className="text-xl font-bold text-card-foreground mb-4 flex items-center gap-2">
                <Calendar size={20} className="text-primary" /> Melhores meses para visitar
              </h2>
              <div className="flex flex-wrap gap-2">
                {spot.peakMonths.map(m => (
                  <span key={m} className="text-sm font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary">
                    {monthNames[m - 1]}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Map placeholder */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-6 rounded-2xl border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
              <h2 className="text-xl font-bold text-card-foreground mb-3 flex items-center gap-2">
                <MapPin size={20} className="text-accent" /> Localização
              </h2>
              <p className="text-sm text-muted-foreground mb-3">
                Coordenadas: {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
              </p>
              <a
                href={`https://www.google.com/maps?q=${spot.lat},${spot.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
              >
                <MapPin size={14} /> Ver no Google Maps →
              </a>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="p-6 rounded-2xl border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
              <h3 className="text-lg font-bold text-card-foreground mb-4">Informações</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <DollarSign size={18} className="text-secondary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Custo médio / pessoa</p>
                    <p className="font-bold text-foreground">
                      {spot.avgCostPerPerson === 0 ? 'Gratuito' : `R$ ${spot.avgCostPerPerson}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Star size={18} className="text-secondary fill-secondary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Avaliação</p>
                    <p className="font-bold text-foreground">{spot.rating} / 5.0</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cidade</p>
                    <p className="font-bold text-foreground">{city.name}</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => navigate(`/planejar?city=${cityId}`)}
                className="w-full mt-6 gradient-pe border-0 rounded-full font-bold text-primary-foreground gap-2"
              >
                <Compass size={16} /> Planejar viagem
              </Button>
            </motion.div>

            {/* Other spots in same city */}
            {otherSpots.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="p-6 rounded-2xl border border-border bg-card" style={{ boxShadow: 'var(--card-shadow)' }}>
                <h3 className="text-lg font-bold text-card-foreground mb-4">Mais em {city.name}</h3>
                <div className="space-y-3">
                  {otherSpots.map(s => (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/atividade/${cityId}/${s.id}`)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 transition-all text-left"
                    >
                      <span className="text-2xl">{s.imageEmoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-card-foreground truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.avgCostPerPerson === 0 ? 'Gratuito' : `R$ ${s.avgCostPerPerson}/pessoa`}
                        </p>
                      </div>
                      <span className="flex items-center gap-0.5 text-xs">
                        <Star size={10} className="text-secondary fill-secondary" />
                        {s.rating}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <footer className="text-center py-8 text-sm text-muted-foreground border-t border-border">
        <span className="font-black"><span className="text-primary">TRIP</span><span className="text-accent">SMART</span></span> · Explore Pernambuco 🏖️
      </footer>
    </div>
  );
};

export default ActivityDetail;
