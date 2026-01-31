import * as React from "react";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onChange, onClear, placeholder = "Search...", ...props }, ref) => {
    const handleClear = () => {
      onChange("");
      onClear?.();
    };

    return (
      <div className={cn("relative group", className)}>
        {/* Gradient border effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-secondary via-primary to-secondary rounded-xl opacity-30 group-hover:opacity-50 group-focus-within:opacity-75 blur-sm transition-opacity" />

        <div className="relative flex items-center bg-card rounded-xl border border-border-subtle overflow-hidden">
          {/* Search icon */}
          <div className="flex items-center justify-center w-12 h-12 text-muted-foreground">
            <Search className="w-5 h-5" />
          </div>

          {/* Input */}
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 h-12 bg-transparent text-foreground placeholder:text-muted-foreground text-base focus:outline-none pr-4"
            {...props}
          />

          {/* Clear button */}
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center justify-center w-10 h-10 mr-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";

export { SearchInput };
