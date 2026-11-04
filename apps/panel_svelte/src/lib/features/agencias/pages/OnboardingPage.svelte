<script lang="ts">
  import Pagina from '$lib/shared/ui/Pagina.svelte';
  import PageHeader from '$lib/shared/ui/PageHeader.svelte';
  import Consentimiento from '$lib/features/legal/components/Consentimiento.svelte';
  import { registrarAgencia } from '../api/agencias.api';
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

  // Mismas reglas que las restricciones CHECK de la base de datos.
  const rntValido = $derived(/^[0-9]{4,8}$/.test(numeroRnt.trim()));
  const matriculaValida = $derived(/^[0-9][0-9 -]{3,19}$/.test(matricula.trim()));

  const pasos = [
    { n: 1, titulo: 'Registra tus datos', texto: 'RNT, matrícula y contacto.' },
    { n: 2, titulo: 'Verificamos', texto: 'Contrastamos el RNT y la matrícula.' },
    { n: 3, titulo: 'Publica y vende', texto: 'Tus planes aparecen en la app.' },
  ];

  async function guardar(e: SubmitEvent) {
    e.preventDefault();
    intentado = true;
    if (!rntValido || !matriculaValida) {
      error = 'Revisa el RNT y la matrícula: deben ser numéricos.';
      return;
    }
    guardando = true;
    error = '';
    try {
      // Primero la autorización: es requisito previo al tratamiento.
      await registrarConsentimiento('tratamiento_datos');
      await registrarConsentimiento('terminos_agencia');
      await registrarAgencia({
        nombre: nombre.trim(),
        numero_rnt: numeroRnt.trim(),
        matricula_camara_comercio: matricula.trim(),
        ciudad: ciudad.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        descripcion: descripcion.trim(),
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
      Solo publicamos agencias formales. Con tu Registro Nacional de Turismo (RNT) y la matrícula
      mercantil verificamos tu registro antes de que tus planes aparezcan en el catálogo.
    {/snippet}
  </PageHeader>

  <ol class="mt-6 grid gap-3 sm:grid-cols-3">
    {#each pasos as p}
      <li class="tarjeta flex items-start gap-3.5 p-4">
        <span
          class="font-titulo grid size-10 shrink-0 place-items-center rounded-brote bg-helecho text-[20px] leading-none font-bold text-sobre-helecho"
          >{p.n}</span
        >
        <span>
          <span class="font-titulo block text-[19px] leading-tight font-bold">{p.titulo}</span>
          <span class="mt-0.5 block text-[15px] text-tinta-2">{p.texto}</span>
        </span>
      </li>
    {/each}
  </ol>

  <form class="tarjeta mt-5 grid gap-4 rounded-hoja-grande p-6 sm:grid-cols-2 sm:p-8" onsubmit={guardar}>
    <label class="sm:col-span-2">
      <span class="etiqueta-campo">Nombre de la agencia *</span>
      <input required bind:value={nombre} class="campo" autocomplete="organization" />
    </label>
    <label>
      <span class="etiqueta-campo">Número de RNT *</span>
      <input
        required
        bind:value={numeroRnt}
        class="campo"
        inputmode="numeric"
        placeholder="Ej. 85421"
        pattern={'[0-9]{4,8}'}
        oninvalid={() => (intentado = true)}
        aria-invalid={intentado && !rntValido}
        aria-describedby="ayuda-rnt"
      />
      <span id="ayuda-rnt" class="mt-1 block text-[14px] text-tinta-2"
        >Entre 4 y 8 dígitos, tal como aparece en tu certificado.</span
      >
    </label>
    <label>
      <span class="etiqueta-campo">Matrícula mercantil *</span>
      <input
        required
        bind:value={matricula}
        class="campo"
        inputmode="numeric"
        placeholder="Ej. 02345678-9"
        aria-invalid={intentado && !matriculaValida}
      />
    </label>
    <label>
      <span class="etiqueta-campo">Ciudad *</span>
      <input required bind:value={ciudad} class="campo" autocomplete="address-level2" />
    </label>
    <label>
      <span class="etiqueta-campo">Teléfono *</span>
      <input required bind:value={telefono} class="campo" type="tel" autocomplete="tel" />
    </label>
    <label>
      <span class="etiqueta-campo">Correo de contacto *</span>
      <input type="email" required bind:value={email} class="campo" autocomplete="email" />
    </label>
    <label>
      <span class="etiqueta-campo">WhatsApp</span>
      <input bind:value={whatsapp} placeholder="+57…" class="campo" type="tel" />
    </label>
    <label class="sm:col-span-2">
      <span class="etiqueta-campo">Descripción</span>
      <textarea
        rows="3"
        bind:value={descripcion}
        class="campo resize-none"
        placeholder="Qué tipo de experiencias ofreces y desde cuándo operas."
      ></textarea>
    </label>

    <div class="border-t border-linea pt-4 sm:col-span-2">
      <Consentimiento bind:datos={aceptaDatos} bind:terminos={aceptaTerminos} />
    </div>

    {#if error}
      <p class="text-[15px] font-semibold text-heliconia sm:col-span-2" role="alert">{error}</p>
    {/if}

    <div class="flex justify-end sm:col-span-2">
      <button
        type="submit"
        class="btn btn-primario"
        disabled={guardando || !aceptaDatos || !aceptaTerminos || !nombre.trim()}
      >
        {guardando ? 'Enviando…' : 'Enviar a verificación'}
      </button>
    </div>
  </form>
</Pagina>
