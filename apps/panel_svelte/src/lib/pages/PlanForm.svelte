<script lang="ts">
  import Logo from '../components/Logo.svelte';
  import Select from '../components/Select.svelte';
  import { miAgencia, misPlanes, crearPlan, actualizarPlan, mensajeError } from '../api';
  import { go } from '../router.svelte';
  import { horaCorta, textoPoliticaCompleto, validarPolitica } from '../politica';
  import { avisar } from '../toast.svelte';
  import { CATEGORIAS, draftVacio, type PlanDraft, type CategoriaValor } from '../types';

  let { planId }: { planId?: string } = $props();

  let d = $state<PlanDraft>(draftVacio());
  let cargando = $state(!!planId);
  let guardando = $state(false);
  let error = $state('');
  let intentado = $state(false);

  let nuevoIncluye = $state('');
  let nuevaFoto = $state('');

  // Duración estructurada: cantidad + unidad → compone duracionTexto.
  const UNIDADES = ['dias', 'horas', 'minutos'] as const;
  type Unidad = (typeof UNIDADES)[number];
  const ETIQUETA_UNIDAD: Record<Unidad, string> = {
    dias: 'día',
    horas: 'hora',
    minutos: 'minuto',
  };
  let duracionCantidad = $state<number | null>(1);
  let duracionUnidad = $state<Unidad>('dias');
  const unidadesOpciones = $derived(
    UNIDADES.map((u) => ({
      valor: u,
      etiqueta:
        duracionCantidad === 1 ? ETIQUETA_UNIDAD[u] : ETIQUETA_UNIDAD[u] + 's',
    })),
  );

  function componerDuracion() {
    const n = duracionCantidad ?? 0;
    if (n <= 0) {
      d.duracionTexto = '';
      return;
    }
    d.duracionTexto = `${n} ${ETIQUETA_UNIDAD[duracionUnidad]}${n === 1 ? '' : 's'}`;
  }

  function parsearDuracion(texto: string) {
    const m = /(\d+(?:[.,]\d+)?)\s*(d[ií]a|hora|minuto|horas|d[ií]as|minutos)/i.exec(texto);
    if (!m) {
      duracionCantidad = null;
      duracionUnidad = 'dias';
      return;
    }
    duracionCantidad = parseFloat(m[1].replace(',', '.'));
    const u = m[2].toLowerCase();
    duracionUnidad = u.startsWith('d') ? 'dias' : u.startsWith('h') ? 'horas' : 'minutos';
  }

  $effect(() => {
    if (!planId) return;
    (async () => {
      try {
        const agencia = await miAgencia();
        const planes = agencia ? await misPlanes(agencia.id) : [];
        const p = planes.find((x) => x.id === planId);
        if (p) {
          d = {
            id: p.id,
            titulo: p.titulo,
            destino: p.destino,
            categoria: p.categoria as CategoriaValor,
            precioCop: p.precio_cop,
            resumen: p.resumen,
            descripcion: p.descripcion,
            duracionTexto: p.duracion_texto,
            puntoEncuentro: p.punto_encuentro,
            incluye: [...p.incluye],
            incluyeTransporte: p.incluye_transporte,
            incluyeComida: p.incluye_comida,
            incluyeHospedaje: p.incluye_hospedaje,
            itinerario: p.itinerario.map((i) => ({ ...i })),
            politicaCancelacion: p.politica_cancelacion,
            politicaNotas: p.politica_notas ?? '',
            horasCancelacionGratuita: p.horas_cancelacion_gratuita,
            horasReembolsoParcial: p.horas_reembolso_parcial,
            porcentajeReembolsoParcial: p.porcentaje_reembolso_parcial,
            horaSalida: horaCorta(p.hora_salida),
            fotos: [...p.fotos],
          };
          parsearDuracion(p.duracion_texto);
        }
      } catch (e) {
        error = mensajeError(e);
      } finally {
        cargando = false;
      }
    })();
  });

  // El texto de la política se genera siempre desde estos números (api.ts lo vuelve a generar al guardar).
  const erroresPolitica = $derived(validarPolitica(d));
  const politicaValida = $derived(Object.keys(erroresPolitica).length === 0);
  const textoVistaPrevia = $derived(
    politicaValida ? textoPoliticaCompleto(d) : 'Completa la política de cancelación para ver el texto que leerá el viajero.',
  );

  async function guardar(e: SubmitEvent) {
    e.preventDefault();
    intentado = true;
    if (d.precioCop <= 0) {
      error = 'El precio debe ser mayor a 0.';
      return;
    }
    if (!politicaValida) {
      error = Object.values(erroresPolitica)[0] ?? 'Revisa la política de cancelación.';
      return;
    }
    guardando = true;
    error = '';
    try {
      const agencia = await miAgencia();
      if (!agencia) throw new Error('No se encontró tu agencia.');
      if (d.id == null) {
        await crearPlan(agencia.id, d);
        avisar('Plan creado como borrador.');
      } else {
        await actualizarPlan(d);
        avisar('Plan guardado.');
      }
      go('/planes');
    } catch (e) {
      error = mensajeError(e);
    } finally {
      guardando = false;
    }
  }

  function agregarIncluye() {
    const v = nuevoIncluye.trim();
    if (v && !d.incluye.includes(v)) {
      d.incluye = [...d.incluye, v];
      nuevoIncluye = '';
    }
  }

  function agregarFoto() {
    const v = nuevaFoto.trim();
    if (v.startsWith('http') && !d.fotos.includes(v)) {
      d.fotos = [...d.fotos, v];
      nuevaFoto = '';
    }
  }
</script>

{#if cargando}
  <div class="grid min-h-[60vh] place-items-center">
    <div class="size-7 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"></div>
  </div>
{:else}
  <div class="mx-auto max-w-[820px] px-6 pb-20">
    <!-- Toolbar -->
    <div class="flex items-center gap-3 py-5">
      <a
        href="#/planes"
        class="grid size-9 place-items-center rounded-full text-slate-500 transition
          hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-ink-700"
        title="Volver"
      >
        <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5m7 7l-7-7 7-7"/></svg>
      </a>
      <h1 class="text-[19px] font-extrabold tracking-tight">
        {planId ? 'Editar plan' : 'Nuevo plan'}
      </h1>
      <div class="flex-1"></div>
      <button
        form="form-plan"
        type="submit"
        disabled={guardando}
        class="rounded-full bg-brand-600 px-6 py-2 text-[13.5px] font-bold text-white transition
          hover:bg-brand-500 disabled:opacity-60"
      >
        {guardando ? 'Guardando…' : 'Guardar'}
      </button>
    </div>

    <form id="form-plan" class="space-y-4" onsubmit={guardar}>
      <!-- Lo esencial -->
      <section
        class="rounded-2xl border border-slate-200/80 bg-white p-6
          dark:border-ink-600 dark:bg-ink-800"
      >
        <h2 class="mb-4 text-[11.5px] font-bold tracking-[0.12em] text-slate-400">LO ESENCIAL</h2>
        <div class="space-y-3">
          <label class="block">
            <span class="etiqueta">Título del plan *</span>
            <input required bind:value={d.titulo} class="campo" />
          </label>
          <div class="grid gap-3 min-[640px]:grid-cols-4">
            <label>
              <span class="etiqueta">Destino *</span>
              <input required bind:value={d.destino} class="campo" />
            </label>
            <label>
              <span class="etiqueta">Categoría</span>
              <Select
                opciones={CATEGORIAS.map((c) => ({
                  valor: c.valor,
                  etiqueta: `${c.emoji} ${c.label}`,
                }))}
                valor={d.categoria}
                onchange={(v) => (d.categoria = v as CategoriaValor)}
              />
            </label>
            <label>
              <span class="etiqueta">Precio final COP *</span>
              <input
                type="number"
                min="1"
                required
                bind:value={d.precioCop}
                class="campo"
                placeholder="150000"
              />
            </label>
            <div>
              <span class="etiqueta">Duración *</span>
              <div class="flex gap-2">
                <input
                  type="number"
                  min="1"
                  required
                  bind:value={duracionCantidad}
                  oninput={componerDuracion}
                  class="campo w-[74px] shrink-0 text-center"
                />
                <Select
                  clase="flex-1"
                  opciones={unidadesOpciones}
                  valor={duracionUnidad}
                  onchange={(v) => {
                    duracionUnidad = v as Unidad;
                    componerDuracion();
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Resumen y descripción -->
      <section
        class="rounded-2xl border border-slate-200/80 bg-white p-6
          dark:border-ink-600 dark:bg-ink-800"
      >
        <h2 class="mb-4 text-[11.5px] font-bold tracking-[0.12em] text-slate-400">
          RESUMEN Y DESCRIPCIÓN
        </h2>
        <div class="space-y-3">
          <label class="block">
            <span class="etiqueta">Resumen corto</span>
            <input bind:value={d.resumen} class="campo" placeholder="Una frase que venda el plan" />
          </label>
          <label class="block">
            <span class="etiqueta">Descripción completa</span>
            <textarea rows="4" bind:value={d.descripcion} class="campo resize-none"></textarea>
          </label>
        </div>
      </section>

      <!-- Qué incluye -->
      <section
        class="rounded-2xl border border-slate-200/80 bg-white p-6
          dark:border-ink-600 dark:bg-ink-800"
      >
        <h2 class="mb-4 text-[11.5px] font-bold tracking-[0.12em] text-slate-400">
          QUÉ INCLUYE · PRECIO FINAL SIN SORPRESAS
        </h2>
        <div class="flex flex-wrap gap-5">
          <label class="flex items-center gap-2 text-[13.5px] font-medium">
            <input type="checkbox" bind:checked={d.incluyeTransporte} class="switch" /> Transporte
          </label>
          <label class="flex items-center gap-2 text-[13.5px] font-medium">
            <input type="checkbox" bind:checked={d.incluyeComida} class="switch" /> Comida
          </label>
          <label class="flex items-center gap-2 text-[13.5px] font-medium">
            <input type="checkbox" bind:checked={d.incluyeHospedaje} class="switch" /> Hospedaje
          </label>
        </div>
        {#if d.incluye.length > 0}
          <div class="mt-3 flex flex-wrap gap-2">
            {#each d.incluye as item, i (item)}
              <span
                class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[12.5px]
                  font-medium dark:bg-ink-700"
              >
                {item}
                <button
                  type="button"
                  class="text-slate-400 hover:text-red-600"
                  onclick={() => (d.incluye = d.incluye.filter((_, j) => j !== i))}
                >
                  ✕</button
                >
              </span>
            {/each}
          </div>
        {/if}
        <div class="mt-3 flex gap-2">
          <input
            bind:value={nuevoIncluye}
            class="campo"
            placeholder="Otro ítem (ej. Guía certificado)"
            onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarIncluye())}
          />
          <button
            type="button"
            class="grid size-[42px] shrink-0 place-items-center rounded-xl border border-slate-200
              text-slate-500 transition hover:bg-slate-100 dark:border-ink-600 dark:hover:bg-ink-700"
            onclick={agregarIncluye}
          >
            +
          </button>
        </div>
      </section>

      <!-- Itinerario -->
      <section
        class="rounded-2xl border border-slate-200/80 bg-white p-6
          dark:border-ink-600 dark:bg-ink-800"
      >
        <h2 class="mb-4 text-[11.5px] font-bold tracking-[0.12em] text-slate-400">ITINERARIO</h2>
        <div class="space-y-2">
          {#each d.itinerario as paso, i}
            <div class="flex items-center gap-2">
              <input
                value={paso.hora}
                oninput={(e) => (d.itinerario[i] = { hora: e.currentTarget.value, actividad: paso.actividad })}
                class="campo w-[92px] shrink-0 text-center"
                placeholder="07:00"
              />
              <input
                value={paso.actividad}
                oninput={(e) => (d.itinerario[i] = { hora: paso.hora, actividad: e.currentTarget.value })}
                class="campo"
                placeholder="Actividad"
              />
              <button
                type="button"
                class="grid size-[38px] shrink-0 place-items-center rounded-xl text-slate-400
                  transition hover:text-red-600"
                onclick={() => (d.itinerario = d.itinerario.filter((_, j) => j !== i))}
              >
                🗑
              </button>
            </div>
          {/each}
        </div>
        <button
          type="button"
          class="mt-3 rounded-full px-3 py-1.5 text-[13px] font-semibold text-brand-600 transition
            hover:bg-brand-600/10 dark:text-brand-300"
          onclick={() => (d.itinerario = [...d.itinerario, { hora: '', actividad: '' }])}
        >
          + Agregar paso
        </button>
      </section>

      <!-- Encuentro, cancelación y fotos -->
      <section
        class="rounded-2xl border border-slate-200/80 bg-white p-6
          dark:border-ink-600 dark:bg-ink-800"
      >
        <h2 class="mb-4 text-[11.5px] font-bold tracking-[0.12em] text-slate-400">
          ENCUENTRO, CANCELACIÓN Y FOTOS
        </h2>
        <div class="space-y-3">
          <div class="grid gap-3 min-[640px]:grid-cols-[1fr_180px]">
            <label class="block">
              <span class="etiqueta">Punto de encuentro</span>
              <input bind:value={d.puntoEncuentro} class="campo" />
            </label>
            <label class="block">
              <span class="etiqueta">Hora de salida (hora de Colombia) *</span>
              <input
                type="time"
                required
                bind:value={d.horaSalida}
                class="campo"
                aria-invalid={intentado && !!erroresPolitica.horaSalida}
              />
            </label>
          </div>
          <div
            class="space-y-3 rounded-xl border border-slate-200/80 bg-paper p-4 dark:border-ink-600 dark:bg-ink-900"
            role="group"
            aria-label="Política de cancelación"
          >
            <h3 class="text-[13px] font-bold">Política de cancelación y reembolsos</h3>
            <p class="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
              Las horas se cuentan hacia atrás desde la fecha del plan y su hora de salida. Con estos
              números se calcula el reembolso al cancelar y se escribe el texto que ve el viajero.
            </p>
            <div class="grid gap-3 min-[640px]:grid-cols-3">
              <label class="block">
                <span class="etiqueta">Cancelación gratuita hasta (horas antes) *</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  bind:value={d.horasCancelacionGratuita}
                  class="campo"
                  aria-invalid={intentado && !!erroresPolitica.horasGratis}
                />
                {#if intentado && erroresPolitica.horasGratis}
                  <span class="mt-1 block text-[12px] text-red-600" role="alert">{erroresPolitica.horasGratis}</span>
                {/if}
              </label>
              <label class="block">
                <span class="etiqueta">Reembolso parcial hasta (horas antes)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  bind:value={d.horasReembolsoParcial}
                  class="campo"
                  placeholder="Opcional"
                  aria-invalid={intentado && !!erroresPolitica.horasParcial}
                />
                {#if intentado && erroresPolitica.horasParcial}
                  <span class="mt-1 block text-[12px] text-red-600" role="alert">{erroresPolitica.horasParcial}</span>
                {/if}
              </label>
              <label class="block">
                <span class="etiqueta">Porcentaje de reembolso parcial (1–99)</span>
                <input
                  type="number"
                  min="1"
                  max="99"
                  step="1"
                  bind:value={d.porcentajeReembolsoParcial}
                  class="campo"
                  placeholder="Opcional"
                  aria-invalid={intentado && !!erroresPolitica.porcentajeParcial}
                />
                {#if intentado && erroresPolitica.porcentajeParcial}
                  <span class="mt-1 block text-[12px] text-red-600" role="alert">{erroresPolitica.porcentajeParcial}</span>
                {/if}
              </label>
            </div>
            <label class="block">
              <span class="etiqueta">Notas de la política (opcional)</span>
              <textarea
                rows="2"
                bind:value={d.politicaNotas}
                class="campo resize-none"
                placeholder="Ej.: Avisar restricciones alimentarias."
              ></textarea>
              <span class="mt-1 block text-[12px] text-slate-500 dark:text-slate-400">
                Frases que no cambian el reembolso: se muestran al viajero después de la política.
              </span>
            </label>
            <p class="text-[13px] leading-relaxed" data-testid="politica-texto">
              <span class="font-semibold">Lo que verá el viajero:</span>
              {textoVistaPrevia}
            </p>
          </div>
          {#if d.fotos.length > 0}
            <div class="flex flex-wrap gap-2">
              {#each d.fotos as f, i (f)}
                <span
                  class="inline-flex max-w-[320px] items-center gap-1.5 rounded-full bg-slate-100 px-3
                    py-1 text-[11.5px] dark:bg-ink-700"
                >
                  <span class="truncate">{f}</span>
                  <button
                    type="button"
                    class="text-slate-400 hover:text-red-600"
                    onclick={() => (d.fotos = d.fotos.filter((_, j) => j !== i))}
                  >
                    ✕</button
                  >
                </span>
              {/each}
            </div>
          {/if}
          <div class="flex gap-2">
            <input
              bind:value={nuevaFoto}
              class="campo"
              placeholder="URL de foto (https://…)"
              onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarFoto())}
            />
            <button
              type="button"
              class="grid size-[42px] shrink-0 place-items-center rounded-xl border border-slate-200
                text-slate-500 transition hover:bg-slate-100 dark:border-ink-600 dark:hover:bg-ink-700"
              onclick={agregarFoto}
            >
              +
            </button>
          </div>
        </div>
      </section>

      {#if error}
        <p class="text-[13px] font-medium text-red-600">{error}</p>
      {/if}
      <p class="pb-4 text-[12px] text-slate-400">
        * El precio es final: lo que ve el viajero es lo que paga, sin cargos ocultos (Anexo 4).
      </p>
    </form>
  </div>
{/if}

<style>
  .etiqueta {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 600;
    color: rgb(71 85 105);
  }
  :global(.dark) .etiqueta {
    color: rgb(148 163 184);
  }
  .campo {
    width: 100%;
    border-radius: 12px;
    border: 1px solid rgb(0 0 0 / 0.1);
    background: rgb(0 0 0 / 0.03);
    padding: 9px 14px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  :global(.dark) .campo {
    border-color: rgb(255 255 255 / 0.09);
    background: rgb(255 255 255 / 0.04);
  }
  .campo:focus {
    border-color: var(--color-brand-400);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-brand-400) 25%, transparent);
  }
  .switch {
    appearance: none;
    width: 38px;
    height: 22px;
    border-radius: 999px;
    background: rgb(0 0 0 / 0.15);
    position: relative;
    cursor: pointer;
    transition: background 0.2s;
  }
  .switch::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: white;
    transition: left 0.2s;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
  }
  .switch:checked {
    background: var(--color-brand-600);
  }
  .switch:checked::after {
    left: 19px;
  }
</style>
