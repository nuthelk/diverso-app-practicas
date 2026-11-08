<script lang="ts">
  /** Cuentas de demostración del login: la página solo las dibuja con `import.meta.env.DEV`, nunca en el build publicado. */
  let { elegir }: { elegir: (email: string, password: string) => void } = $props();

  const CLAVE = 'demo1234';
  const cuentas = [
    { etiqueta: 'Agencia verificada', email: 'graffiti@demo.com' },
    { etiqueta: 'En verificación', email: 'patrimonio@demo.com' },
    { etiqueta: 'Admin', email: 'admin@demo.com' },
  ];
</script>

<section class="mt-8 border-t border-linea pt-5" aria-labelledby="demo-titulo">
  <h2 id="demo-titulo" class="etiqueta-seccion">Cuentas de demostración</h2>
  <p class="mt-1 text-detalle text-tinta-2">
    Solo en desarrollo. Contraseña de todas: <span class="font-bold text-tinta">{CLAVE}</span>
  </p>
  <div class="mt-3 flex flex-wrap gap-2">
    {#each cuentas as c}
      <button type="button" class="chip" onclick={() => elegir(c.email, CLAVE)}>{c.etiqueta}</button>
    {/each}
  </div>
</section>
