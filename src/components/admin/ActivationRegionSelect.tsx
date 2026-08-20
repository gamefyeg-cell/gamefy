interface ActivationRegionOption {
  id: string;
  name: string;
  kind: string;
  code: string | null;
  zoneId: string | null;
}

/// Renders <option>s grouped as Global / Zones / Country-under-zone —
/// shared by the variant create and edit forms so "activation region"
/// (plan: Global vs. a zone like Europe/Middle East vs. a specific country
/// like Egypt/France) always looks the same in the admin UI.
export default function ActivationRegionSelect({
  name,
  regions,
  defaultValue,
}: {
  name: string;
  regions: ActivationRegionOption[];
  defaultValue?: string | null;
}) {
  const global = regions.filter((r) => r.kind === "GLOBAL");
  const zones = regions.filter((r) => r.kind === "ZONE");
  const countries = regions.filter((r) => r.kind === "COUNTRY");

  return (
    <select name={name} defaultValue={defaultValue ?? ""} className="input">
      <option value="">— Not set —</option>
      {global.map((g) => (
        <option key={g.id} value={g.id}>
          🌍 {g.name}
        </option>
      ))}
      {zones.map((zone) => {
        const inZone = countries.filter((c) => c.zoneId === zone.id);
        return (
          <optgroup key={zone.id} label={zone.name}>
            <option value={zone.id}>{zone.name} (whole zone)</option>
            {inZone.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.code ? `(${c.code})` : ""}
              </option>
            ))}
          </optgroup>
        );
      })}
      {countries.filter((c) => !c.zoneId).length > 0 && (
        <optgroup label="Other countries">
          {countries
            .filter((c) => !c.zoneId)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.code ? `(${c.code})` : ""}
              </option>
            ))}
        </optgroup>
      )}
    </select>
  );
}
