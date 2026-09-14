import type { Campaign } from "@prisma/client";

export default function CampaignForm({
  campaign,
  action,
  submitLabel,
}: {
  campaign?: Campaign;
  action: (fd: FormData) => void;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-6">
      <section className="card flex flex-col gap-4">
        <h2 className="font-semibold">Datos de la campaña</h2>
        <div>
          <label className="field-label" htmlFor="name">
            Nombre de la campaña
          </label>
          <input
            id="name"
            name="name"
            className="input"
            required
            defaultValue={campaign?.name}
            placeholder='Ej. "Software contable — CABA"'
          />
        </div>
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="font-semibold">Qué vendo</h2>
        <div>
          <label className="field-label" htmlFor="productTitle">
            Producto / servicio
          </label>
          <input
            id="productTitle"
            name="productTitle"
            className="input"
            required
            defaultValue={campaign?.productTitle}
            placeholder="Ej. Software de facturación electrónica"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="productDescription">
            Descripción
          </label>
          <textarea
            id="productDescription"
            name="productDescription"
            className="textarea"
            rows={3}
            required
            defaultValue={campaign?.productDescription}
            placeholder="Qué problema resuelve, a quién le sirve, qué lo diferencia..."
          />
        </div>
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="font-semibold">Dónde buscar</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="country">
              País
            </label>
            <input
              id="country"
              name="country"
              className="input"
              required
              defaultValue={campaign?.country}
              placeholder="Argentina"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="region">
              Región (opcional)
            </label>
            <input id="region" name="region" className="input" defaultValue={campaign?.region ?? ""} />
          </div>
          <div>
            <label className="field-label" htmlFor="province">
              Provincia (opcional)
            </label>
            <input
              id="province"
              name="province"
              className="input"
              defaultValue={campaign?.province ?? ""}
              placeholder="Buenos Aires"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="city">
              Ciudad (opcional)
            </label>
            <input
              id="city"
              name="city"
              className="input"
              defaultValue={campaign?.city ?? ""}
              placeholder="CABA"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="radiusKm">
              Radio en km (opcional)
            </label>
            <input
              id="radiusKm"
              name="radiusKm"
              type="number"
              min={0}
              className="input"
              defaultValue={campaign?.radiusKm ?? ""}
            />
          </div>
        </div>
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="font-semibold">Qué empresas buscar</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="sector">
              Sector / industria
            </label>
            <input
              id="sector"
              name="sector"
              className="input"
              defaultValue={campaign?.sector ?? ""}
              placeholder="Ej. estudios contables"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="companySize">
              Tamaño de empresa
            </label>
            <input
              id="companySize"
              name="companySize"
              className="input"
              defaultValue={campaign?.companySize ?? ""}
              placeholder="Ej. 10 a 50 empleados"
            />
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="keywords">
            Palabras clave (separadas por coma)
          </label>
          <input
            id="keywords"
            name="keywords"
            className="input"
            defaultValue={campaign?.keywords ?? ""}
            placeholder="facturación electrónica, AFIP, contadores"
          />
        </div>
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="font-semibold">Qué contacto buscar</h2>
        <div>
          <label className="field-label" htmlFor="targetRoles">
            Cargos / roles objetivo (separados por coma)
          </label>
          <input
            id="targetRoles"
            name="targetRoles"
            className="input"
            defaultValue={campaign?.targetRoles ?? ""}
            placeholder="Gerente de IT, Dueño, CEO, Socio"
          />
        </div>
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="font-semibold">Límites de la corrida</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="maxCompanies">
              Cantidad máxima de empresas por corrida
            </label>
            <input
              id="maxCompanies"
              name="maxCompanies"
              type="number"
              min={1}
              className="input"
              defaultValue={campaign?.maxCompanies ?? 20}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="minScoreThreshold">
              Score mínimo para guardar un prospecto (0–100)
            </label>
            <input
              id="minScoreThreshold"
              name="minScoreThreshold"
              type="number"
              min={0}
              max={100}
              className="input"
              defaultValue={campaign?.minScoreThreshold ?? 0}
            />
          </div>
        </div>
      </section>

      <div>
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
