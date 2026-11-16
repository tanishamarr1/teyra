import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configured = Boolean(url && key && !url.includes("TU-PROYECTO"));

// PKCE: los enlaces de correo llegan como ?code=... y no chocan con el router por hash (#/ruta).
export const sb = createClient(configured ? url : "https://placeholder.supabase.co", configured ? key : "placeholder", {
  auth: { flowType: "pkce" },
});
