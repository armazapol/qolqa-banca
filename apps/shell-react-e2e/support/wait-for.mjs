/** Espera a que una URL responda (orden de arranque de los servidores E2E). */
const [, , url, timeoutMs = '60000'] = process.argv;
const deadline = Date.now() + Number(timeoutMs);
while (Date.now() < deadline) {
  const ok = await fetch(url)
    .then((r) => r.ok)
    .catch(() => false);
  if (ok) process.exit(0);
  await new Promise((resolve) => setTimeout(resolve, 500));
}
console.error(`No respondió a tiempo: ${url}`);
process.exit(1);
