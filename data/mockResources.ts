import type { Resource } from "../types";

export const mockResources: Resource[] = [
  {
    id: "cam-001",
    assetId: "CAM-01",
    name: "Canon R6",
    category: "Cámaras",
    operationalStatus: "active",
    includes: ["Batería", "Tapa", "Correa"],
  },
  {
    id: "tri-001",
    assetId: "TRI-01",
    name: "Trípode",
    category: "Trípodes",
    operationalStatus: "active",
    includes: ["Placa rápida"],
  },
  {
    id: "vr-001",
    assetId: "MQ3-01",
    name: "Meta Quest 3",
    category: "VR",
    operationalStatus: "active",
    includes: ["Controles", "Cargador"],
  },
  {
    id: "ani-001",
    assetId: "ANI-01",
    name: "Mesa de animación",
    category: "Animación",
    operationalStatus: "maintenance",
  },
];