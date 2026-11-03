<script lang="ts">
  import { goto } from '$app/navigation';
  import { auth } from '$lib/features/auth/model/auth.svelte';

  // Starter reparte por rol. Sin sesión, el guard del layout manda a /login.
  $effect(() => {
    if (auth.userId) goto('#/starter', { replaceState: true });
  });
</script>
