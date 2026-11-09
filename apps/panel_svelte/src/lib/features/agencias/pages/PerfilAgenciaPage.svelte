<script lang="ts">
  import { tick } from 'svelte';
  import Pagina from '$lib/shared/ui/Pagina.svelte';
  import PageHeader from '$lib/shared/ui/PageHeader.svelte';
  import EsqueletoPagina from '$lib/shared/ui/EsqueletoPagina.svelte';
  import Tarjeta from '$lib/shared/ui/Tarjeta.svelte';
  import Empty from '$lib/shared/ui/Empty.svelte';
  import AlertaError from '$lib/shared/ui/AlertaError.svelte';
  import StatusPill from '$lib/shared/ui/StatusPill.svelte';
  import Campo from '$lib/shared/ui/Campo.svelte';
  import { mensajeError } from '$lib/shared/api/errores';
  import { avisar } from '$lib/shared/lib/toast.svelte';
  import { confirmar } from '$lib/shared/lib/confirmar.svelte';
  import { actualizarDatosAgencia, miAgencia } from '../api/agencias.api';
  import type { Agency } from '../model/agencia';
  import { textoVigencia } from '../model/verificacion';
  import LogoAgencia from '../components/LogoAgencia.svelte';
  import { datosDeAgencia, normalizarDatosAgencia, validarDatosAgencia, type DatosAgencia } from '../model/datos-agencia';
  import { avisarCambioAgencia } from '../model/cambios-agencia.svelte';

  /**
   * El perfil de la agencia: su logo (cambiar o quitar) y sus datos de contacto, que se editan aquí. El RNT y la
   * matrícula respaldan la verificación: se muestran pero no se cambian. Se abre desde el menú de cuenta del marco.
   */
  let cargando = $state(true);
  let error = $state('');
  let agencia = $state<Agency | null>(null);

  async function cargar() {
    cargando = true;
    error = '';
    try {
      agencia = await miAgencia();
    } catch (e) {
      error = mensajeError(e);
    } finally {
      cargando = false;
    }
  }

  function logoActualizado(logoUrl: string | null) {
    if (agencia) agencia = { ...agencia, logo_url: logoUrl };
    avisarCambioAgencia();
  }

  /* Edición de los datos de contacto: el borrador es lo que se escribe; `agencia` sigue siendo lo guardado. */
  let editando = $state(false);
  let borrador = $state<DatosAgencia>({ nombre: '', ciudad: '', telefono: '', email: '', whatsapp: '', descripcion: '' });
  let intentado = $state(false);
  let guardando = $state(false);
  let errorGuardado = $state('');
  let formulario = $state<HTMLFormElement>();
  let botonEditar = $state<HTMLButtonElement>();

  /** Sin intento de guardado no se marca nada; después se actualiza al corregir cada campo. */
  const fallas = $derived(intentado ? validarDatosAgencia(borrador) : []);
  const errorDe = (clave: string) => fallas.find((f) => f.clave === clave)?.mensaje;
  const faltan = $derived(new Intl.ListFormat('es', { type: 'conjunction' }).format(fallas.map((f) => f.resumen)));
  const hayCambios = $derived.by(() => {
    if (!agencia) return false;
    const original = datosDeAgencia(agencia);
    return (Object.keys(original) as (keyof DatosAgencia)[]).some((k) => borrador[k] !== original[k]);
  });

  async function empezarEdicion() {
    if (!agencia) return;
    borrador = datosDeAgencia(agencia);
    intentado = false;
    errorGuardado = '';
    editando = true;
    await tick();
    formulario?.querySelector<HTMLElement>('input')?.focus();
  }

  async function cerrarEdicion() {
    editando = false;
    await tick();
    botonEditar?.focus();
  }

  /** Escape no descarta en silencio: sin cambios cierra; con cambios pregunta antes. */
  async function alTeclear(e: KeyboardEvent) {
    if (e.key !== 'Escape' || guardando) return;
    const descartar =
      !hayCambios ||
      (await confirmar({
        titulo: '¿Descartar los cambios?',
        mensaje: 'Lo que escribiste no se guardará.',
        confirmar: 'Descartar',
        cancelar: 'Seguir editando',
        peligro: true,
      }));
    if (descartar) cerrarEdicion();
  }

  async function guardar(e: SubmitEvent) {
    e.preventDefault();
    if (!agencia || guardando) return;
    intentado = true;
    if (fallas.length > 0) {
      await tick();
      formulario?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    guardando = true;
    errorGuardado = '';
    try {
      const datos = normalizarDatosAgencia(borrador);
      await actualizarDatosAgencia(agencia.id, datos);
      agencia = { ...agencia, ...datos };
      avisar('Datos guardados');
      avisarCambioAgencia();
      cerrarEdicion();
    } catch (e) {
      errorGuardado = mensajeError(e);
    } finally {
      guardando = false;
    }
  }

  // Carga al montar (initState): llamada directa, sin $effect.
  cargar();

  const vigencia = $derived(agencia ? textoVigencia(agencia) : null);
  /** Lo que la agencia no llenó (teléfono, correo y WhatsApp pueden ser null) se dice, no se deja en blanco. */
  const registrado = (valor: string | null) => (valor ?? '').trim() || 'No registrado';
</script>

{#if cargando}
  <EsqueletoPagina ancho={820} filas={2} clase="h-40" />
{:else}
  <Pagina ancho={820}>
    <PageHeader titulo="Perfil de la agencia">
      {#snippet contexto()}Tu logo y los datos de contacto de tu agencia.{/snippet}
    </PageHeader>

    {#if error}
      <div class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <AlertaError>{error}</AlertaError>
        <button type="button" class="btn btn-secundario btn-chico" onclick={cargar}>Reintentar</button>
      </div>
    {:else if !agencia}
      <div class="mt-6 tarjeta">
        <Empty icono="edificio" titulo="Aún no tienes agencia" mensaje="Registra tu agencia para tener un perfil.">
          {#snippet accion()}<a class="btn btn-primario" href="#/onboarding">Registrar mi agencia</a>{/snippet}
        </Empty>
      </div>
    {:else}
      <div class="mt-6 grid gap-6">
        <LogoAgencia {agencia} onactualizado={logoActualizado} />

        <Tarjeta
          titulo="Datos de la agencia"
          descripcion={editando ? 'Los viajeros ven el nombre, la ciudad y la descripción de tu agencia.' : 'Así se presenta y se contacta tu agencia.'}
        >
          {#snippet accion()}
            {#if !editando}
              <button bind:this={botonEditar} type="button" class="btn btn-secundario btn-chico" onclick={empezarEdicion}>
                Editar datos
              </button>
            {/if}
          {/snippet}

          {#if editando}
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <!-- Escape llega desde los campos del formulario (el diálogo de confirmación vive fuera de él). -->
            <form bind:this={formulario} class="grid gap-4 sm:grid-cols-2" onsubmit={guardar} onkeydown={alTeclear} novalidate>
              {#if fallas.length > 0}
                <AlertaError clase="sm:col-span-2">Para guardar falta completar {faltan}.</AlertaError>
              {/if}
              {#if errorGuardado}
                <AlertaError clase="sm:col-span-2">{errorGuardado}</AlertaError>
              {/if}

              <Campo clase="sm:col-span-2" etiqueta="Nombre de la agencia" error={errorDe('nombre')}>
                {#snippet control(a)}
                  <input {...a} bind:value={borrador.nombre} class="campo" autocomplete="organization" />
                {/snippet}
              </Campo>
              <Campo etiqueta="Ciudad" error={errorDe('ciudad')}>
                {#snippet control(a)}
                  <input {...a} bind:value={borrador.ciudad} class="campo" autocomplete="address-level2" />
                {/snippet}
              </Campo>
              <Campo etiqueta="Teléfono" error={errorDe('telefono')}>
                {#snippet control(a)}
                  <input {...a} bind:value={borrador.telefono} class="campo" type="tel" autocomplete="tel" />
                {/snippet}
              </Campo>
              <Campo etiqueta="Correo de contacto" error={errorDe('email')}>
                {#snippet control(a)}
                  <input {...a} bind:value={borrador.email} class="campo" type="email" autocomplete="email" />
                {/snippet}
              </Campo>
              <Campo etiqueta="WhatsApp (opcional)">
                {#snippet control(a)}
                  <input {...a} bind:value={borrador.whatsapp} placeholder="+57…" class="campo" type="tel" />
                {/snippet}
              </Campo>
              <Campo clase="sm:col-span-2" etiqueta="Descripción (opcional)">
                {#snippet control(a)}
                  <textarea
                    {...a}
                    rows="3"
                    bind:value={borrador.descripcion}
                    class="campo resize-none"
                    placeholder="Qué tipo de experiencias ofreces y desde cuándo operas."
                  ></textarea>
                {/snippet}
              </Campo>

              <div class="border-t border-linea pt-4 sm:col-span-2">
                <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt class="text-detalle text-tinta-2">Número de RNT</dt>
                    <dd class="font-semibold tabular-nums">{agencia.numero_rnt}</dd>
                  </div>
                  <div>
                    <dt class="text-detalle text-tinta-2">Matrícula mercantil</dt>
                    <dd class="font-semibold tabular-nums">{agencia.matricula_camara_comercio}</dd>
                  </div>
                </dl>
                <p class="mt-2 text-detalle text-tinta-2">
                  No se pueden cambiar desde aquí: respaldan la verificación de tu agencia.
                </p>
              </div>

              <div class="flex flex-wrap justify-end gap-2 sm:col-span-2">
                <button type="button" class="btn btn-secundario" disabled={guardando} onclick={cerrarEdicion}>Cancelar</button>
                <button type="submit" class="btn btn-primario" disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          {:else}
          <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <dt class="text-detalle text-tinta-2">Nombre</dt>
              <dd class="text-destacado font-semibold [overflow-wrap:anywhere]">{agencia.nombre}</dd>
            </div>
            <div>
              <dt class="text-detalle text-tinta-2">Verificación</dt>
              <dd class="mt-0.5"><StatusPill estado={agencia.estado_verificacion} /></dd>
            </div>
            <div>
              <dt class="text-detalle text-tinta-2">Ciudad</dt>
              <dd>{agencia.ciudad}</dd>
            </div>
            <div>
              <dt class="text-detalle text-tinta-2">Número de RNT</dt>
              <dd class="font-semibold tabular-nums">{agencia.numero_rnt}</dd>
            </div>
            <div>
              <dt class="text-detalle text-tinta-2">Vigencia del RNT</dt>
              <dd class="font-semibold {vigencia?.clase}">{vigencia?.texto}</dd>
            </div>
            <div>
              <dt class="text-detalle text-tinta-2">Matrícula mercantil</dt>
              <dd class="font-semibold tabular-nums">{agencia.matricula_camara_comercio}</dd>
            </div>
            <div>
              <dt class="text-detalle text-tinta-2">Correo de contacto</dt>
              <dd class="[overflow-wrap:anywhere]">{registrado(agencia.email)}</dd>
            </div>
            <div>
              <dt class="text-detalle text-tinta-2">Teléfono</dt>
              <dd>{registrado(agencia.telefono)}</dd>
            </div>
            <div>
              <dt class="text-detalle text-tinta-2">WhatsApp</dt>
              <dd>{registrado(agencia.whatsapp)}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-detalle text-tinta-2">Descripción</dt>
              <dd class="max-w-[68ch] whitespace-pre-line [overflow-wrap:anywhere]">{registrado(agencia.descripcion)}</dd>
            </div>
          </dl>
          {/if}
        </Tarjeta>
      </div>
    {/if}
  </Pagina>
{/if}
