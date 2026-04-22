} catch (error) {
  console.error("Erreur serveur Deye:", error);
  return sendJson(res, 500, {
    error: "Erreur serveur",
    details: error?.message || String(error),
    stack: error?.stack || null
  });
}
