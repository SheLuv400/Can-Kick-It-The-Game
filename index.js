/**
 * Public Sites worker.
 *
 * The game is a static client-side app. Serving the built assets directly
 * removes the previous owner-only auth gate so mobile and desktop players can
 * open the same link without a Freebuff account.
 */
export default {
  fetch(request, env) {
    return env.ASSETS.fetch(request)
  },
}
