<script lang="ts">
  import { tick } from 'svelte';
  import Pagina from '$lib/shared/ui/Pagina.svelte';
  import PageHeader from '$lib/shared/ui/PageHeader.svelte';
  import Campo from '$lib/shared/ui/Campo.svelte';
  import AlertaError from '$lib/shared/ui/AlertaError.svelte';
  import Consentimiento from '$lib/features/legal/components/Consentimiento.svelte';
  import { registrarAgencia } from '../api/agencias.api';
  import { normalizarDatosAgencia, validarDatosAgencia } from '../model/datos-agencia';
  import { registrarConsentimiento } from '$lib/features/legal/api/legal.api';
  import { mensajeError } from '$lib/shared/api/errores';
  import { goto } from '$app/navigation';
  import { avisar } from '$lib/shared/lib/toast.svelte';

  let nombre = $state('');
  let numeroRnt = $state('');
  let matricula = $state('');
  let ciudad = $state('Medellín');
  let telefono = $state('');
  let email = $state('');
  let whatsapp = $state('');
  let descripcion = $state('');
  let aceptaDatos = $state(false);
  let aceptaTerminos = $state(false);
  let guardando = $state(false);
  let error = $state('');
  let intentado = $state(false);
  let formulario = $state<HTMLFormElement>();

  /** Lo que falta para enviar: los datos con las reglas compartidas, y las dos autorizaciones (solo de este formulario). */
  const reglas = $derived<{ clave: string; resumen: string; mensaje: string }[]>([
    ...validarDatosAgencia({
      nombre,
      ciudad,
      telefono,
      email,
      whatsapp,
      descripcion,
      numero_rnt: numeroRnt,
      matricula_camara_comercio: matricula,
    }),
    ...(aceptaDatos
      ? []
      : [
          {
            clave: 'datos',
            resumen: 'la autorización de datos',
            mensaje: 'Marca la autorización de datos para poder registrarte.',
          },
        ]),
    ...(aceptaTerminos
      ? []
      : [
          {
            clave: 'terminos',
            resumen: 'los términos y condiciones',
            mensaje: 'Acepta los términos y condiciones para poder registrarte.',
          },
        ]),
  ]);
  /** Sin intento de envío no se marca nada; después se actualiza al corregir cada campo. */
  const fallas = $derived(intentado ? reglas : []);
  const errorDe = (clave: string) => fallas.find((f) => f.clave === clave)?.mensaje;
  const faltan = $derived(new Intl.ListFormat('es', { type: 'conjunction' }).format(fallas.map((f) => f.resumen)));

  const pasos = [
    { n: 1, titulo: 'Registra tus datos', texto: 'RNT, matrícula y contacto.' },
    { n: 2, titulo: 'Verificamos', texto: 'Contrastamos el RNT y la matrícula.' },
    { n: 3, titulo: 'Publica y vende', texto: 'Tus planes aparecen en la app.' },
  ];

  async function guardar(e: SubmitEvent) {
    e.preventDefault();
    intentado = true;
    if (fallas.length > 0) {
      await tick();
      formulario?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    guardando = true;
    error = '';
    try {
      // Primero la autorización: es requisito previo al tratamiento.
      await registrarConsentimiento('tratamiento_datos');
      await registrarConsentimiento('terminos_agencia');
      const datos = normalizarDatosAgencia({ nombre, ciudad, telefono, email, whatsapp, descripcion });
      await registrarAgencia({
        ...datos,
        numero_rnt: numeroRnt.trim(),
        matricula_camara_comercio: matricula.trim(),
        whatsapp: datos.whatsapp ?? '', // el registro guarda vacío (no null), como siempre
      });
      avisar('Agencia registrada. Te avisaremos cuando quede verificada.');
      goto('#/dashboard');
    } catch (e) {
      error = mensajeError(e);
    } finally {
      guardando = false;
    }
  }
</script>

<Pagina ancho={760}>
  <PageHeader titulo="Registra tu agencia">
    {#snippet contexto()}
      Solo publicamos agencias formales: verificamos tu Registro Nacional de Turismo (RNT) y tu matrícula mercantil antes de
      que tus planes aparezcan en el catálogo. Hasta que registres tu agencia no podrás usar Planes, Ventas ni Liquidaciones.
    {/snippet}
  </PageHeader>

  <ol class="mt-6 grid gap-3 sm:grid-cols-3">
    {#each pasos as p}
      <li class="tarjeta flex items-start gap-3 p-4">
        <span class="grid size-8 shrink-0 place-items-center rounded-pildora bg-helecho text-detalle font-bold text-sobre-helecho">
          {p.n}
        </span>
        <span>
          <span class="block text-cuerpo leading-tight font-bold">{p.titulo}</span>
          <span class="mt-0.5 block text-detalle text-tinta-2">{p.texto}</span>
        </span>
      </li>
    {/each}
  </ol>

  <form bind:this={formulario} class="tarjeta mt-5 grid gap-4 p-5 sm:grid-cols-2 sm:p-6" onsubmit={guardar} novalidate>
    <p class="text-detalle text-tinta-2 sm:col-span-2">Todos los campos son obligatorios, salvo WhatsApp y la descripción.</p>

    <Campo clase="sm:col-span-2" etiqueta="Nombre de la agencia" error={errorDe('nombre')}>
      {#snippet control(a)}
        <input {...a} bind:value={nombre} class="campo" autocomplete="organization" />
      {/snippet}
    </Campo>
    <Campo
      etiqueta="Número de RNT"
      ayuda="Registro Nacional de Turismo: el número de tu certificado, de 4 a 8 dígitos."
      error={errorDe('rnt')}
    >
      {#snippet control(a)}
        <input {...a} bind:value={numeroRnt} class="campo" inputmode="numeric" placeholder="Ej. 85421" />
      {/snippet}
    </Campo>
    <Campo
      etiqueta="Matrícula mercantil"
      ayuda="La de la Cámara de Comercio, solo números; puedes usar guiones."
      error={errorDe('matricula')}
    >
      {#snippet control(a)}
        <input {...a} bind:value={matricula} class="campo" inputmode="numeric" placeholder="Ej. 02345678-9" />
      {/snippet}
    </Campo>
    <Campo etiqueta="Ciudad" error={errorDe('ciudad')}>
      {#snippet control(a)}
        <input {...a} bind:value={ciudad} class="campo" autocomplete="address-level2" />
      {/snippet}
    </Campo>
    <Campo etiqueta="Teléfono" error={errorDe('telefono')}>
      {#snippet control(a)}
        <input {...a} bind:value={telefono} class="campo" type="tel" autocomplete="tel" />
      {/snippet}
    </Campo>
    <Campo etiqueta="Correo de contacto" error={errorDe('email')}>
      {#snippet control(a)}
        <input {...a} bind:value={email} class="campo" type="email" autocomplete="email" />
      {/snippet}
    </Campo>
    <Campo etiqueta="WhatsApp (opcional)">
      {#snippet control(a)}
        <input {...a} bind:value={whatsapp} placeholder="+57…" class="campo" type="tel" />
      {/snippet}
    </Campo>
    <Campo clase="sm:col-span-2" etiqueta="Descripción (opcional)">
      {#snippet control(a)}
        <textarea
          {...a}
          rows="3"
          bind:value={descripcion}
          class="campo resize-none"
          placeholder="Qué tipo de experiencias ofreces y desde cuándo operas."
        ></textarea>
      {/snippet}
    </Campo>

    <div class="border-t border-linea pt-4 sm:col-span-2">
      <Consentimiento
        bind:datos={aceptaDatos}
        bind:terminos={aceptaTerminos}
        errorDatos={errorDe('datos')}
        errorTerminos={errorDe('terminos')}
      />
    </div>

    {#if fallas.length > 0}
      <AlertaError clase="sm:col-span-2">Para enviar falta completar {faltan}.</AlertaError>
    {/if}
    {#if error}
      <AlertaError clase="sm:col-span-2">{error}</AlertaError>
    {/if}

    <div class="flex justify-end sm:col-span-2">
      <button type="submit" class="btn btn-primario" disabled={guardando}>
        {guardando ? 'Enviando…' : 'Enviar a verificación'}
      </button>
    </div>
  </form>
</Pagina>
