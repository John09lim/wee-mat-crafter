import { useState, useEffect, useMemo, useCallback } from "react";
import { Check, ChevronsUpDown, MapPin, School, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  BACONG_DISTRICT_NAME,
  BACONG_DISTRICT_SCHOOLS,
  canonicalDistrictName,
  canonicalSchoolName,
  isBacongDistrict,
} from "@/lib/districtReporting";

interface SchoolOption {
  name: string;
  district: string;
}

interface SchoolDistrictPickerProps {
  school: string;
  district: string;
  onSchoolChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
  schoolLabel?: string;
  districtLabel?: string;
  helper?: string;
  required?: boolean;
  compact?: boolean;
}

export default function SchoolDistrictPicker({
  school,
  district,
  onSchoolChange,
  onDistrictChange,
  schoolLabel = "School name",
  districtLabel = "District",
  helper,
  required = false,
  compact = false,
}: SchoolDistrictPickerProps) {
  const [schoolOptions, setSchoolOptions] = useState<SchoolOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [districtOpen, setDistrictOpen] = useState(false);
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchSchools = async () => {
      try {
        const { data, error } = await supabase
          .from("schools")
          .select("school_name, district_name");

        if (error || cancelled) return;

        const dbSchools: SchoolOption[] = (data || [])
          .filter((row) => row.school_name && row.district_name)
          .map((row) => ({
            name: canonicalSchoolName(row.school_name),
            district: canonicalDistrictName(row.district_name),
          }));

        const bacongSchools: SchoolOption[] = BACONG_DISTRICT_SCHOOLS.map(
          (s) => ({ name: s.name, district: BACONG_DISTRICT_NAME }),
        );

        const all = [...bacongSchools, ...dbSchools];
        // Deduplicate by lowercase name+district key
        const seen = new Set<string>();
        const unique = all.filter((opt) => {
          const key = `${opt.name.toLowerCase()}|${opt.district.toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        if (!cancelled) {
          setSchoolOptions(unique);
          const districts = Array.from(
            new Set(unique.map((s) => s.district)),
          ).sort((a, b) => a.localeCompare(b));
          setDistrictOptions(districts);
        }
      } catch {
        // Silently fall back to Bacong-only data
        if (!cancelled) {
          const bacongOnly = BACONG_DISTRICT_SCHOOLS.map((s) => ({
            name: s.name,
            district: BACONG_DISTRICT_NAME,
          }));
          setSchoolOptions(bacongOnly);
          setDistrictOptions([BACONG_DISTRICT_NAME]);
        }
      }
    };

    fetchSchools();
    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveDistrict = useMemo(
    () => canonicalDistrictName(district) || district.trim(),
    [district],
  );

  const schoolsForDistrict = useMemo(() => {
    if (!effectiveDistrict) return schoolOptions;
    return schoolOptions.filter((opt) => {
      const optDistrict = opt.district.toLowerCase().replace(/\s+district$/, "").trim();
      const myDistrict = effectiveDistrict.toLowerCase().replace(/\s+district$/, "").trim();
      return optDistrict === myDistrict;
    });
  }, [schoolOptions, effectiveDistrict]);

  const filteredDistricts = useMemo(() => {
    if (!districtSearch) return districtOptions;
    const q = districtSearch.toLowerCase();
    return districtOptions.filter((d) => d.toLowerCase().includes(q));
  }, [districtOptions, districtSearch]);

  const filteredSchools = useMemo(() => {
    const search = schoolSearch || school;
    if (!search) return schoolsForDistrict;
    const q = search.toLowerCase();
    return schoolsForDistrict.filter((s) => s.name.toLowerCase().includes(q));
  }, [schoolsForDistrict, schoolSearch, school]);

  const handleDistrictSelect = useCallback(
    (value: string) => {
      onDistrictChange(value);
      setDistrictOpen(false);
      setDistrictSearch("");
      // Clear school if it doesn't belong to the new district
      const schoolInDistrict = schoolsForDistrict.some(
        (s) => s.name.toLowerCase() === school.toLowerCase(),
      );
      if (school && !schoolInDistrict) {
        onSchoolChange("");
      }
    },
    [onDistrictChange, onSchoolChange, school, schoolsForDistrict],
  );

  const handleSchoolSelect = useCallback(
    (selected: SchoolOption) => {
      onSchoolChange(selected.name);
      // Auto-fill district if empty or different
      if (!district || canonicalDistrictName(district) !== selected.district) {
        onDistrictChange(selected.district);
      }
      setSchoolOpen(false);
      setSchoolSearch("");
    },
    [onSchoolChange, onDistrictChange, district],
  );

  const showSchoolFreeText =
    filteredSchools.length === 0 && schoolSearch.length > 0;

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {/* District Picker */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-muted-foreground">
          {districtLabel}
          {required ? <span className="ml-0.5 text-red-500">*</span> : null}
        </Label>
        <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={districtOpen}
              className="h-11 w-full justify-between border-input bg-transparent font-normal text-foreground hover:bg-transparent"
            >
              <span className="flex items-center gap-2 truncate">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                {effectiveDistrict || (
                  <span className="text-muted-foreground">Select your district</span>
                )}
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search districts…"
                value={districtSearch}
                onValueChange={setDistrictSearch}
              />
              <CommandList>
                <CommandEmpty>No district found.</CommandEmpty>
                <CommandGroup>
                  {filteredDistricts.map((d) => (
                    <CommandItem
                      key={d}
                      value={d}
                      onSelect={() => handleDistrictSelect(d)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          effectiveDistrict.toLowerCase() === d.toLowerCase()
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {d}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {districtSearch && !filteredDistricts.includes(districtSearch.trim()) && (
                  <CommandGroup>
                    <CommandItem
                      value={districtSearch.trim()}
                      onSelect={() => handleDistrictSelect(districtSearch.trim())}
                      className="cursor-pointer"
                    >
                      <MapPin className="mr-2 h-4 w-4 text-primary" />
                      Use "{districtSearch.trim()}"
                    </CommandItem>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* School Picker */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-muted-foreground">
          {schoolLabel}
          {required ? <span className="ml-0.5 text-red-500">*</span> : null}
        </Label>
        <Popover open={schoolOpen} onOpenChange={setSchoolOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={schoolOpen}
              className="h-11 w-full justify-between border-input bg-transparent font-normal text-foreground hover:bg-transparent"
            >
              <span className="flex items-center gap-2 truncate">
                <School className="h-4 w-4 shrink-0 text-muted-foreground" />
                {school || (
                  <span className="text-muted-foreground">
                    {effectiveDistrict
                      ? "Search or type your school"
                      : "Select a district first"}
                  </span>
                )}
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search schools…"
                value={schoolSearch}
                onValueChange={setSchoolSearch}
              />
              <CommandList>
                {filteredSchools.length === 0 && !showSchoolFreeText ? (
                  <CommandEmpty>
                    {effectiveDistrict
                      ? "No schools found. Type to add yours."
                      : "Select a district first."}
                  </CommandEmpty>
                ) : null}
                <CommandGroup>
                  {filteredSchools.map((s) => (
                    <CommandItem
                      key={`${s.district}|${s.name}`}
                      value={s.name}
                      onSelect={() => handleSchoolSelect(s)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          school.toLowerCase() === s.name.toLowerCase()
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <span className="flex flex-col">
                        {s.name}
                        <span className="text-xs text-muted-foreground">{s.district}</span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {showSchoolFreeText && (
                  <CommandGroup>
                    <CommandItem
                      value={schoolSearch}
                      onSelect={() => {
                        onSchoolChange(schoolSearch);
                        setSchoolOpen(false);
                        setSchoolSearch("");
                      }}
                      className="cursor-pointer"
                    >
                      <School className="mr-2 h-4 w-4 text-primary" />
                      Use "{schoolSearch}"
                    </CommandItem>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {/* Manual free-text fallback */}
        <Input
          type="text"
          value={school}
          onChange={(e) => onSchoolChange(e.target.value)}
          placeholder="Or type your school name"
          className="h-10 text-sm"
          autoComplete="organization"
        />
      </div>

      {helper && (
        <p className="text-xs text-muted-foreground">{helper}</p>
      )}
    </div>
  );
}
