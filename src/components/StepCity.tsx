import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Star, Check, Loader2 } from "lucide-react";
import { pernambucoCities, monthNames, categoryLabels } from "@/data/mockData";
import StarRating from "@/components/StarRating";
import { useTouristSpots, type CatalogContext } from "@/data/catalog";
import { useActivityRatingAverages } from "@/data/reviews";
import type { TouristSpot, CityData } from "@/types/travel";

interface StepCityProps {
  month: number | null;
  budget: number;
  budgetLabel: string;
  people: number;
  days: number;
  transportToDestination: string | null;
  preSelectedCity?: string;
  onNext: (cityId: string, cityName: string, spots: TouristSpot[]) => void;
}

const categories = ["Todos", "turismo", "praia", "trilha", "entretenimento", "cultura", "natureza"];

const StepCity = ({
  month,
  budget,
  budgetLabel,
  people,
  days,
  transportToDestination,
  preSelectedCity,
  onNext,
}: StepCityProps) => {
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityData | null>(
    preSelectedCity ? pernambucoCities.find((c) => c.id === preSelectedCity) || null : null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedSpots, setSelectedSpots] = useState<TouristSpot[]>([]);
  const [catFilter, setCatFilter] = useState("Todos");

  // A query é chaveada pela cidade, então trocar de cidade rápido não deixa mais
  // a resposta antiga sobrescrever a nova — cada cidade tem sua própria entrada.
  const catalogContext: CatalogContext | null = selectedCity
    ? {
        cityId: selectedCity.id,
        cityName: selectedCity.name,
        budget,
        budgetLabel,
        people,
        days,
        month,
        transportToDestination,
      }
    : null;

  const { data: spots = [], isLoading: loadingSpots, isError } = useTouristSpots(catalogContext);
  const { data: activityAvgRatings = {} } = useActivityRatingAverages(selectedCity?.id);

  const filteredCities = useMemo(() => {
    return pernambucoCities.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const filteredSpots = useMemo(() => {
    if (catFilter === "Todos") return spots;
    return spots.filter((s) => s.category === catFilter);
  }, [spots, catFilter]);

  // Abre direto quando a cidade veio pela URL (?city=).
  useEffect(() => {
    if (!preSelectedCity) return;
    const city = pernambucoCities.find((c) => c.id === preSelectedCity);
    if (city) {
      setSelectedCity(city);
      setSheetOpen(true);
    }
  }, [preSelectedCity]);

  const toggleSpot = (spot: TouristSpot) => {
    setSelectedSpots((prev) =>
      prev.find((s) => s.id === spot.id) ? prev.filter((s) => s.id !== spot.id) : [...prev, spot],
    );
  };

  const isSpotInSeason = (spot: TouristSpot) => (month ? spot.peakMonths.includes(month) : true);

  const getBestMonth = (spot: TouristSpot) => {
    if (!spot.peakMonths.length) return "";
    return monthNames[spot.peakMonths[0] - 1];
  };

  const handleCityClick = (city: CityData) => {
    setSelectedCity(city);
    setSelectedSpots([]);
    setCatFilter("Todos");
    setSheetOpen(true);
  };

  const handleConfirmSpots = () => {
    if (!selectedCity) return;
    setSheetOpen(false);
    onNext(selectedCity.id, selectedCity.name, selectedSpots);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-8"
    >
      <div className="text-center space-y-2">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-display text-foreground">
          Qual cidade de <span className="gradient-text">Pernambuco?</span>
        </h2>
        <p className="text-muted-foreground text-lg">
          Selecione a cidade e as atividades
          {month && (
            <>
              {" "}
              · <span className="font-semibold">{monthNames[month - 1]}</span>
            </>
          )}
        </p>
      </div>

      <div
        className="w-full max-w-md flex items-center gap-2 px-4 py-3 bg-card rounded-2xl border border-border"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        <Search size={18} className="text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar cidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent outline-none text-sm text-foreground w-full placeholder:text-muted-foreground"
        />
      </div>

      <div className="w-full grid gap-3">
        {filteredCities.map((city, i) => (
          <motion.button
            key={city.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.4 }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCityClick(city)}
            className="p-4 rounded-2xl border border-border bg-card text-left transition-shadow hover:shadow-lg hover:border-primary/40"
            style={{ boxShadow: "var(--card-shadow)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {city.imageUrl ? (
                  <img
                    src={city.imageUrl}
                    alt={city.name}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <span className="text-2xl">{city.imageEmoji}</span>
                )}
                <div>
                  <h3 className="text-lg font-bold text-card-foreground">{city.name}</h3>
                  <p className="text-muted-foreground text-xs mt-0.5">{city.description}</p>
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-2xl font-extrabold tracking-display">
              {selectedCity?.imageEmoji} {selectedCity?.name}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              Atividades
              {month && (
                <>
                  {" "}
                  · Viagem em <span className="font-semibold">{monthNames[month - 1]}</span>
                </>
              )}
            </p>
          </SheetHeader>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mt-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                  catFilter === cat
                    ? "gradient-pe text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {cat === "Todos" ? "🔄 Todos" : categoryLabels[cat] || cat}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {loadingSpots ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 size={32} className="animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">Buscando pontos turisticos..</p>
              </div>
            ) : isError ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-2">Não foi possível carregar as atividades.</p>
                <p className="text-xs text-primary font-semibold">Tente novamente mais tarde.</p>
              </div>
            ) : filteredSpots.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {spots.length === 0
                    ? "Nenhuma atividade encontrada para esta cidade."
                    : "Nenhuma atividade nesta categoria."}
                </p>
              </div>
            ) : (
              filteredSpots.map((spot) => {
                const inSeason = isSpotInSeason(spot);
                const isSelected = selectedSpots.find((s) => s.id === spot.id);
                return (
                  <button
                    key={spot.id}
                    onClick={() => toggleSpot(spot)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      isSelected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        {spot.imageUrl ? (
                          <img
                            src={spot.imageUrl}
                            alt={spot.name}
                            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                          />
                        ) : (
                          <span className="text-2xl mt-0.5 flex-shrink-0">{spot.imageEmoji}</span>
                        )}
                        <div>
                          <h4 className="font-bold text-foreground">{spot.name}</h4>
                          <p className="text-sm text-muted-foreground mt-0.5">{spot.description}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="flex items-center gap-1 text-xs">
                              <Star size={12} className="text-primary fill-primary" />
                              <span className="font-bold text-foreground">{spot.rating}</span>
                            </span>
                            {activityAvgRatings[spot.name] && (
                              <span className="flex items-center gap-1 text-xs">
                                <StarRating value={activityAvgRatings[spot.name].avg} readOnly size={10} showValue={false} />
                                <span className="text-muted-foreground">({activityAvgRatings[spot.name].count})</span>
                              </span>
                            )}
                            {spot.category && (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                                {categoryLabels[spot.category]}
                              </span>
                            )}
                            {spot.avgCostPerPerson !== undefined && (
                              <span className="text-xs font-semibold text-accent">
                                {spot.avgCostPerPerson === 0 ? "Gratuito" : `~R$ ${spot.avgCostPerPerson}/pessoa`}
                              </span>
                            )}
                            {inSeason ? (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-secondary/20 text-secondary">
                                🔥 Em alta
                              </span>
                            ) : spot.peakMonths?.length > 0 ? (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted/20 text-muted-foreground">
                                Mês em alta: {getBestMonth(spot)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full gradient-pe flex items-center justify-center flex-shrink-0">
                          <Check size={14} className="text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {spots.length > 0 && (
            <div className="mt-6 sticky bottom-0 bg-background pt-4 pb-2">
              <Button
                onClick={handleConfirmSpots}
                disabled={selectedSpots.length === 0}
                className="w-full h-14 rounded-full text-lg font-bold gradient-pe border-0 text-primary-foreground"
              >
                Confirmar {selectedSpots.length} atividade{selectedSpots.length !== 1 ? "s" : ""}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </motion.div>
  );
};

export default StepCity;
