"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { VILLES_FRANCE } from "@/shared/constants";
import { cn } from "@/lib/utils";

/** Combobox ville de France : sélection dans une liste indicative, ou saisie libre au clavier. */
export function VilleFranceCombobox({
  value,
  onChange,
  placeholder = "Sélectionnez ou tapez une ville…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return VILLES_FRANCE;
    return VILLES_FRANCE.filter((v) => v.toLowerCase().includes(q));
  }, [search]);

  const trimmed = search.trim();
  const exactMatch = VILLES_FRANCE.some((v) => v.toLowerCase() === trimmed.toLowerCase());

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-ardoise")}>{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-ardoise" strokeWidth={1.5} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Rechercher une ville…" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>Aucune ville trouvée.</CommandEmpty>
            <CommandGroup>
              {trimmed && !exactMatch && (
                <CommandItem value={`__use__${trimmed}`} onSelect={() => select(trimmed)} className="text-lapis">
                  Utiliser « {trimmed} »
                </CommandItem>
              )}
              {filtered.map((ville) => (
                <CommandItem key={ville} value={ville} onSelect={() => select(ville)}>
                  <Check
                    className={cn("mr-2 h-4 w-4", value === ville ? "opacity-100" : "opacity-0")}
                    strokeWidth={1.5}
                  />
                  {ville}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
