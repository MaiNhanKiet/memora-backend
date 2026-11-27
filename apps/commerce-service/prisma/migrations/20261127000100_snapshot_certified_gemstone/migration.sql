ALTER TABLE "ordering"."ring_item_version_gemstones"
  ADD COLUMN "certified_gemstone_id" UUID,
  ADD CONSTRAINT "ordering_ring_item_version_gemstones_certified_gemstone_id_fk"
    FOREIGN KEY ("certified_gemstone_id") REFERENCES "inventory"."certified_gemstones"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT;
