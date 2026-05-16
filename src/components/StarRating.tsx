import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: number;
  showValue?: boolean;
}

const StarRating = ({ value, onChange, readOnly = false, size = 18, showValue = true }: StarRatingProps) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = hover ? star <= hover : star <= value;
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readOnly && setHover(star)}
            onMouseLeave={() => !readOnly && setHover(0)}
            aria-label={`${star} ${star === 1 ? "estrela" : "estrelas"}`}
            className={`transition-colors ${readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
          >
            <Star
              size={size}
              aria-hidden="true"
              className={filled ? "text-primary fill-primary" : "text-muted-foreground/40"}
            />
          </button>
        );
      })}
      {showValue && value > 0 && (
        <span className="text-xs font-bold text-foreground ml-1">{value.toFixed(1)}</span>
      )}
    </div>
  );
};

export default StarRating;
