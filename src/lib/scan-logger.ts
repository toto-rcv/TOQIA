import { db, scans } from "@/db";

type ScanRecord = {
  braceletId: number;
  restaurantId: number;
  scannedAt: Date;
  userAgent: string | null;
  ipHash: string | null;
};

/**
 * Registra un escaneo SIN bloquear la redirección.
 *
 * Regla de oro del endpoint /r/[code]: el cliente nunca espera a que se
 * escriba nada. Esta función se invoca sin `await` y se encarga sola de que
 * un fallo de base no se propague: cualquier error se loguea y se traga.
 *
 * Peor caso posible: perdemos un registro de escaneo. Eso es molesto pero
 * recuperable. Que no redirija es un cliente parado mirando una pantalla en
 * blanco al lado de la caja, y eso no.
 */
export function recordScan(record: ScanRecord): void {
  void writeScan(record).catch((error: unknown) => {
    // No relanzamos: esta promesa no la espera nadie y un reject sin manejar
    // tumbaría el proceso en Node.
    console.error("[scan-logger] no se pudo registrar el escaneo", {
      braceletId: record.braceletId,
      restaurantId: record.restaurantId,
      scannedAt: record.scannedAt.toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

async function writeScan(record: ScanRecord): Promise<void> {
  await db.insert(scans).values({
    braceletId: record.braceletId,
    restaurantId: record.restaurantId,
    // Se guarda en UTC. mysql2 está configurado con timezone "Z".
    scannedAt: record.scannedAt,
    // La columna es varchar(512): truncamos en vez de dejar que MySQL rechace
    // la fila entera por un user agent largo.
    userAgent: record.userAgent ? record.userAgent.slice(0, 512) : null,
    ipHash: record.ipHash,
  });
}
