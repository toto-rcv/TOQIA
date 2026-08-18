/**
 * Configuración de PM2.
 *
 *   pm2 start ecosystem.config.js --env production
 *   pm2 save
 *   pm2 startup        # imprime el comando para que arranque solo al bootear
 *
 * Se ejecuta el server standalone que genera `next build`, no `next start`:
 * standalone trae su propio server.js con solo las dependencias necesarias.
 */
module.exports = {
  apps: [
    {
      name: "pulseras-nfc",
      script: ".next/standalone/server.js",
      cwd: __dirname,

      // instances: 1 a propósito.
      //
      // El endpoint /r/[code] cachea la relación código → destino en memoria
      // del proceso. Con una sola instancia, invalidar el caché al editar
      // desde el panel tiene efecto inmediato. Si algún día hace falta subir
      // a cluster, el sistema sigue funcionando: los cambios de destino
      // simplemente tardan hasta REDIRECT_CACHE_TTL_SECONDS en propagarse a
      // las instancias que no atendieron la edición.
      instances: 1,
      exec_mode: "fork",

      autorestart: true,
      watch: false,
      max_memory_restart: "400M",

      // Si el proceso muere en bucle, PM2 espera cada vez un poco más en vez
      // de reiniciar sin parar y llenar el disco de logs.
      exp_backoff_restart_delay: 200,

      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "127.0.0.1",
      },

      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "127.0.0.1",
      },

      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
