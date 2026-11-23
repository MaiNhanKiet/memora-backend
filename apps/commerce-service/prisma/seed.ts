import { config as loadDotenv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaClient, Prisma } from '../generated/prisma/client';

loadDotenv({
  path: resolve(__dirname, '../../../.env'),
  override: false,
  quiet: true,
});

async function upsertPriceVersion(
  prisma: PrismaClient,
  priceItemId: string,
  amount: number,
): Promise<void> {
  const existing = await prisma.price_versions.findFirst({
    where: { price_item_id: priceItemId, version_no: 1 },
  });

  if (existing) {
    await prisma.price_versions.update({
      where: { id: existing.id },
      data: { amount: new Prisma.Decimal(amount), status: 'ACTIVE' },
    });
  } else {
    await prisma.price_versions.create({
      data: {
        id: randomUUID(),
        price_item_id: priceItemId,
        version_no: 1,
        amount: new Prisma.Decimal(amount),
        currency: 'VND',
        status: 'ACTIVE',
        effective_from: new Date(),
      },
    });
  }
}

async function main(): Promise<void> {
  const connectionString = process.env.COMMERCE_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'COMMERCE_DATABASE_URL is required to seed Commerce Service',
    );
  }

  const pool = new Pool({
    connectionString,
    max: 2,
    options: '-c search_path=catalog,pricing,design,ordering,inventory,public',
  });
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
  });

  try {
    console.log('[commerce-seed] Starting Master Data Seed...');

    // =========================================================================
    // 1. CATALOG: Materials
    // =========================================================================
    console.log('[commerce-seed] 1. Seeding Materials...');
    const materialsData = [
      {
        code: 'SS925',
        name: 'Sterling Silver 925 (Test Payment)',
        material_family: 'SILVER',
        purity_percent: new Prisma.Decimal(92.5),
        color: 'SILVER',
        status: 'ACTIVE',
      },
      {
        code: 'WG14K',
        name: 'White Gold 14K',
        material_family: 'GOLD',
        purity_percent: new Prisma.Decimal(58.5),
        color: 'WHITE',
        status: 'ACTIVE',
      },
      {
        code: 'WG18K',
        name: 'White Gold 18K',
        material_family: 'GOLD',
        purity_percent: new Prisma.Decimal(75.0),
        color: 'WHITE',
        status: 'ACTIVE',
      },
      {
        code: 'YG18K',
        name: 'Yellow Gold 18K',
        material_family: 'GOLD',
        purity_percent: new Prisma.Decimal(75.0),
        color: 'YELLOW',
        status: 'ACTIVE',
      },
      {
        code: 'RG18K',
        name: 'Rose Gold 18K',
        material_family: 'GOLD',
        purity_percent: new Prisma.Decimal(75.0),
        color: 'ROSE',
        status: 'ACTIVE',
      },
      {
        code: 'PT950',
        name: 'Platinum 950',
        material_family: 'PLATINUM',
        purity_percent: new Prisma.Decimal(95.0),
        color: 'PLATINUM_WHITE',
        status: 'ACTIVE',
      },
    ];

    const materialMap = new Map<string, string>();
    for (const m of materialsData) {
      const row = await prisma.materials.upsert({
        where: { code: m.code },
        update: { name: m.name, status: m.status },
        create: {
          id: randomUUID(),
          ...m,
        },
      });
      materialMap.set(m.code, row.id);
      console.log(`  - Material ${m.code} -> id=${row.id}`);
    }

    // =========================================================================
    // 2. CATALOG: Gemstone Options
    // =========================================================================
    console.log('[commerce-seed] 2. Seeding Gemstone Options...');
    const gemstonesData = [
      {
        code: 'CZ_ROUND_020',
        name: 'Cubic Zirconia 2.0mm (Test Payment)',
        stone_type: 'CUBIC_ZIRCONIA',
        shape: 'ROUND',
        length_mm: new Prisma.Decimal(2.0),
        width_mm: new Prisma.Decimal(2.0),
        color_grade: 'D',
        clarity_grade: 'VVS1',
        certified_required: false,
        status: 'ACTIVE',
      },
      {
        code: 'DIA_NAT_ROUND_050',
        name: 'Natural Diamond Round 0.50ct',
        stone_type: 'NATURAL_DIAMOND',
        shape: 'ROUND',
        length_mm: new Prisma.Decimal(5.1),
        width_mm: new Prisma.Decimal(5.1),
        color_grade: 'F',
        clarity_grade: 'VVS1',
        certified_required: true,
        status: 'ACTIVE',
      },
      {
        code: 'DIA_LAB_ROUND_050',
        name: 'Lab-Grown Diamond Round 0.50ct',
        stone_type: 'LAB_GROWN_DIAMOND',
        shape: 'ROUND',
        length_mm: new Prisma.Decimal(5.1),
        width_mm: new Prisma.Decimal(5.1),
        color_grade: 'E',
        clarity_grade: 'VS1',
        certified_required: false,
        status: 'ACTIVE',
      },
      {
        code: 'MOIS_ROUND_050',
        name: 'Moissanite Round 0.50ct',
        stone_type: 'MOISSANITE',
        shape: 'ROUND',
        length_mm: new Prisma.Decimal(5.0),
        width_mm: new Prisma.Decimal(5.0),
        color_grade: 'D',
        clarity_grade: 'VVS1',
        certified_required: false,
        status: 'ACTIVE',
      },
      {
        code: 'SAPH_BLUE_OVAL_070',
        name: 'Blue Sapphire Oval 0.70ct',
        stone_type: 'SAPPHIRE',
        shape: 'OVAL',
        length_mm: new Prisma.Decimal(6.0),
        width_mm: new Prisma.Decimal(4.0),
        color_grade: 'ROYAL_BLUE',
        clarity_grade: 'VVS2',
        certified_required: false,
        status: 'ACTIVE',
      },
    ];

    const gemstoneMap = new Map<string, string>();
    for (const g of gemstonesData) {
      const row = await prisma.gemstone_options.upsert({
        where: { code: g.code },
        update: { name: g.name, status: g.status },
        create: {
          id: randomUUID(),
          ...g,
        },
      });
      gemstoneMap.set(g.code, row.id);
      console.log(`  - Gemstone ${g.code} -> id=${row.id}`);
    }

    // =========================================================================
    // 3. CATALOG: Ring Templates & 3D Gemstone Slots
    // =========================================================================
    console.log('[commerce-seed] 3. Seeding Ring Templates & 3D Gemstone Slots...');

    const base3DModelDir = resolve(__dirname, '../../../docs/duypq/3D RING MODEL');

    interface ProductionRingTemplateDef {
      code: string;
      name: string;
      description: string;
      folderName: string;
    }

    const productionTemplates: ProductionRingTemplateDef[] = [
      {
        code: 'BAR_001_SW',
        name: 'Memora Bar Ring - Soundwave Edition',
        description:
          'Mẫu nhẫn Bar dáng thẳng tinh tế với bề mặt phẳng rộng, tối ưu cho việc khắc sóng âm thanh độc bản (Soundwave) cùng 2 chấu đá quý.',
        folderName: 'BAR_001_SW',
      },
      {
        code: 'BYPASS_001_SW',
        name: 'Memora Bypass Ring - Soundwave Edition',
        description:
          'Mẫu nhẫn dáng Bypass uốn lượn mềm mại, thiết kế lá cong hiện đại ôm trọn dải sóng âm kỷ niệm và 1 viên đá quý góc phải.',
        folderName: 'BYPASS_001_SW',
      },
      {
        code: 'SIGNET_001_FP',
        name: 'Memora Signet Ring - Fingerprint & Gemstone',
        description:
          'Mẫu nhẫn Signet mặt vuông vát kinh điển, kết hợp đính 1 viên đá quý góc trái và bề mặt phẳng sang trọng khắc dấu vân tay.',
        folderName: 'SIGNET_001_FP',
      },
      {
        code: 'SIGNET_002_FP',
        name: 'Memora Signet Ring - Fingerprint Classic',
        description:
          'Mẫu nhẫn Signet lòng chảo tròn vát, tôn vinh chi tiết dấu vân tay cá nhân hóa của cặp đôi cùng 1 viên đá chủ trung tâm.',
        folderName: 'SIGNET_002_FP',
      },
      {
        code: 'SIGNET_003_FP',
        name: 'Memora Signet Ring - Bold Geometric Fingerprint',
        description:
          'Mẫu nhẫn Signet phong cách mạnh mẽ với bề mặt hình học sắc nét, 2 viên đá quý 2 bên và trung tâm khắc vân tay vĩnh cửu.',
        folderName: 'SIGNET_003_FP',
      },
    ];

    const templateMap = new Map<string, string>();

    // 3.1. Seed mẫu nhẫn test rẻ phục vụ QA / Live PayOS QR
    const testBand = await prisma.ring_templates.upsert({
      where: { code: 'T_TEST_BAND' },
      update: {
        name: 'Memora Test Payment Band',
        status: 'ACTIVE',
        design_supported_personalization_packages: [
          'FINGERPRINT',
          'SOUNDWAVE',
          'INITIALS',
          'NONE',
        ],
      },
      create: {
        id: randomUUID(),
        code: 'T_TEST_BAND',
        name: 'Memora Test Payment Band',
        description:
          'Mẫu nhẫn thử nghiệm giá rẻ ~10k để test toàn trình thanh toán quét QR PayOS',
        glb_asset_key: 'models/minimal_01.glb',
        stone_layout: 'NONE',
        design_supported_personalization_packages: [
          'FINGERPRINT',
          'SOUNDWAVE',
          'INITIALS',
          'NONE',
        ],
        theta_min_deg: new Prisma.Decimal(-180.0),
        theta_max_deg: new Prisma.Decimal(180.0),
        v_min_mm: new Prisma.Decimal(-2.0),
        v_max_mm: new Prisma.Decimal(2.0),
        status: 'ACTIVE',
      },
    });
    templateMap.set('T_TEST_BAND', testBand.id);
    console.log(`  - Ring Template T_TEST_BAND -> id=${testBand.id}`);

    // 3.2. Seed 5 Production 3D Ring Models từ JSON template
    for (const item of productionTemplates) {
      const jsonPath = resolve(base3DModelDir, item.folderName, `${item.folderName}_template.json`);
      let boundaryJson: any = null;
      let forbiddenZonesJson: any = [];
      let packages: string[] = ['NONE'];
      let gemsList: any[] = [];
      let stoneLayout = 'NONE';

      if (existsSync(jsonPath)) {
        try {
          const raw = JSON.parse(readFileSync(jsonPath, 'utf8'));
          boundaryJson = raw.engrave_surface?.boundary || raw.engrave_surface?.boundary_uv || null;
          forbiddenZonesJson = raw.engrave_surface?.forbidden_zones || [];
          packages = raw.packages ? Object.keys(raw.packages) : ['NONE'];
          gemsList = raw.gems || [];
          if (gemsList.length === 1) {
            stoneLayout = 'SOLITAIRE';
          } else if (gemsList.length > 1) {
            stoneLayout = 'ACCENT';
          }
        } catch (err) {
          console.warn(`  ! Không đọc được JSON cho ${item.code}:`, err);
        }
      }

      const row = await prisma.ring_templates.upsert({
        where: { code: item.code },
        update: {
          name: item.name,
          description: item.description,
          glb_asset_key: `models/${item.code}.glb`,
          stone_layout: stoneLayout,
          design_supported_personalization_packages: packages,
          boundary_json: boundaryJson ?? Prisma.DbNull,
          forbidden_zones_json: forbiddenZonesJson,
          status: 'ACTIVE',
        },
        create: {
          id: randomUUID(),
          code: item.code,
          name: item.name,
          description: item.description,
          glb_asset_key: `models/${item.code}.glb`,
          stone_layout: stoneLayout,
          design_supported_personalization_packages: packages,
          boundary_json: boundaryJson ?? Prisma.DbNull,
          forbidden_zones_json: forbiddenZonesJson,
          theta_min_deg: new Prisma.Decimal(-180.0),
          theta_max_deg: new Prisma.Decimal(180.0),
          v_min_mm: new Prisma.Decimal(-2.5),
          v_max_mm: new Prisma.Decimal(2.5),
          status: 'ACTIVE',
        },
      });

      templateMap.set(item.code, row.id);
      console.log(`  - Production Ring Template ${item.code} (Layout: ${stoneLayout}) -> id=${row.id}`);

      // Seed Gemstone Groups & Slots nếu mẫu có đính đá
      if (gemsList.length > 0) {
        const group = await prisma.gemstone_groups.upsert({
          where: {
            ring_template_id_code: {
              ring_template_id: row.id,
              code: 'MAIN_GEMS',
            },
          },
          update: {
            name: `${item.name} Accent Gems`,
            selection_mode: 'INDEPENDENT',
            is_required: false,
          },
          create: {
            id: randomUUID(),
            ring_template_id: row.id,
            code: 'MAIN_GEMS',
            name: `${item.name} Accent Gems`,
            selection_mode: 'INDEPENDENT',
            is_required: false,
            sequence_no: 1,
          },
        });

        for (let i = 0; i < gemsList.length; i++) {
          const g = gemsList[i];
          await prisma.gemstone_slots.upsert({
            where: {
              gemstone_group_id_code: {
                gemstone_group_id: group.id,
                code: g.slot,
              },
            },
            update: {
              glb_node_name: g.slot,
              slot_index: i + 1,
            },
            create: {
              id: randomUUID(),
              gemstone_group_id: group.id,
              code: g.slot,
              slot_index: i + 1,
              glb_node_name: g.slot,
            },
          });
        }
        console.log(`    * Seeded ${gemsList.length} 3D gemstone slots for ${item.code}`);
      }
    }

    // =========================================================================
    // 4. CATALOG: Template Variants (Size chuẩn 12)
    // =========================================================================
    console.log('[commerce-seed] 4. Seeding Template Variants...');
    const variantMap = new Map<string, string>(); // key: `${tCode}_${mCode}`

    for (const [tCode, tId] of templateMap.entries()) {
      for (const [mCode, mId] of materialMap.entries()) {
        const existing = await prisma.template_variants.findFirst({
          where: {
            ring_template_id: tId,
            material_id: mId,
            standard_size: new Prisma.Decimal(12.0),
          },
        });

        const variantId = existing
          ? existing.id
          : (
              await prisma.template_variants.create({
                data: {
                  id: randomUUID(),
                  ring_template_id: tId,
                  material_id: mId,
                  standard_size: new Prisma.Decimal(12.0),
                  max_up_delta: new Prisma.Decimal(2.0),
                  max_down_delta: new Prisma.Decimal(2.0),
                  local_wall_thickness_mm: new Prisma.Decimal(1.8),
                  min_remaining_wall_thickness_mm: new Prisma.Decimal(1.2),
                  max_safe_engraving_depth_mm: new Prisma.Decimal(0.3),
                  status: 'ACTIVE',
                },
              })
            ).id;

        const key = `${tCode}_${mCode}`;
        variantMap.set(key, variantId);
      }
    }
    console.log(`  - Seeded ${variantMap.size} template variants`);

    // =========================================================================
    // 5. PRICING: Price Items & Active Versions
    // =========================================================================
    console.log('[commerce-seed] 5. Seeding Pricing Items & Versions...');

    // A. Ring Blanks Price
    const baseMetalPrices: Record<string, number> = {
      SS925: 5000, // Test payment rẻ
      WG14K: 5500000,
      WG18K: 7200000,
      YG18K: 7200000,
      RG18K: 7500000,
      PT950: 11000000,
    };

    for (const [key, vId] of variantMap.entries()) {
      const lastUnderscore = key.lastIndexOf('_');
      const tCode = key.substring(0, lastUnderscore);
      const mCode = key.substring(lastUnderscore + 1);
      let amount = baseMetalPrices[mCode] ?? 5000000;
      if (tCode === 'T_TEST_BAND') {
        amount = mCode === 'SS925' ? 5000 : 20000;
      }

      const pCode = `BLANK_${tCode}_${mCode}`;
      const item = await prisma.price_items.upsert({
        where: { code: pCode },
        update: { status: 'ACTIVE' },
        create: {
          id: randomUUID(),
          code: pCode,
          price_type: 'RING_BLANK',
          template_variant_id: vId,
          status: 'ACTIVE',
        },
      });

      await upsertPriceVersion(prisma, item.id, amount);
    }

    // B. Gemstones Price
    const gemstonePrices: Record<string, number> = {
      CZ_ROUND_020: 2000, // Test payment rẻ
      DIA_NAT_ROUND_050: 25000000,
      DIA_LAB_ROUND_050: 8500000,
      MOIS_ROUND_050: 2200000,
      SAPH_BLUE_OVAL_070: 6800000,
    };

    for (const [gCode, gId] of gemstoneMap.entries()) {
      const amount = gemstonePrices[gCode] ?? 2000000;
      const pCode = `GEM_${gCode}`;
      const item = await prisma.price_items.upsert({
        where: { code: pCode },
        update: { status: 'ACTIVE' },
        create: {
          id: randomUUID(),
          code: pCode,
          price_type: 'GEMSTONE',
          gemstone_option_id: gId,
          status: 'ACTIVE',
        },
      });

      await upsertPriceVersion(prisma, item.id, amount);
    }

    // C. Personalization Package Price (Theo constraint chỉ FINGERPRINT và SOUNDWAVE)
    const pkgPrices: Record<string, number> = {
      FINGERPRINT: 5000, // Đặt 5,000 để tổng đơn hàng test cọc ~10k
      SOUNDWAVE: 10000,
    };

    for (const [pkg, amount] of Object.entries(pkgPrices)) {
      const pCode = `PKG_${pkg}`;
      const item = await prisma.price_items.upsert({
        where: { code: pCode },
        update: { status: 'ACTIVE' },
        create: {
          id: randomUUID(),
          code: pCode,
          price_type: 'PERSONALIZATION',
          personalization_package: pkg,
          status: 'ACTIVE',
        },
      });

      await upsertPriceVersion(prisma, item.id, amount);
    }

    // D. Maintenance Plan Price (LIFETIME_POLISHING: 500k)
    const maintenancePrices: Record<string, number> = {
      LIFETIME_POLISHING: 500000,
    };

    for (const [planCode, amount] of Object.entries(maintenancePrices)) {
      const pCode = `PLAN_${planCode}`;
      const item = await prisma.price_items.upsert({
        where: { code: pCode },
        update: { status: 'ACTIVE' },
        create: {
          id: randomUUID(),
          code: pCode,
          price_type: 'MAINTENANCE_PLAN',
          status: 'ACTIVE',
        },
      });

      await upsertPriceVersion(prisma, item.id, amount);
    }
    console.log(
      '  - Seeded Price Items and Active Price Versions successfully',
    );

    // =========================================================================
    // 6. INVENTORY: Stock Lots & Certified Gemstones
    // =========================================================================
    console.log(
      '[commerce-seed] 6. Seeding Stock Lots & Certified Gemstones...',
    );
    const testBandSS925VariantId = variantMap.get('T_TEST_BAND_SS925');
    const solitaireWG18KVariantId = variantMap.get('T_SOLITAIRE_01_WG18K');
    const moisGemId = gemstoneMap.get('MOIS_ROUND_050');
    const natDiaGemId = gemstoneMap.get('DIA_NAT_ROUND_050');

    // Lô phôi test band SS925
    if (testBandSS925VariantId) {
      await prisma.stock_lots.upsert({
        where: { stock_code: 'LOT_BLANK_TEST_BAND_SS925' },
        update: { quantity_on_hand: 100 },
        create: {
          id: randomUUID(),
          stock_code: 'LOT_BLANK_TEST_BAND_SS925',
          stock_type: 'RING_BLANK',
          template_variant_id: testBandSS925VariantId,
          lot_code: 'BATCH-2026-TEST',
          quantity_on_hand: 100,
          quantity_reserved: 0,
          unit_cost: new Prisma.Decimal(3000),
          location_code: 'STORE_HN_01',
          status: 'ACTIVE',
          updated_at: new Date(),
        },
      });
    }

    // Lô phôi Solitaire WG18K
    if (solitaireWG18KVariantId) {
      await prisma.stock_lots.upsert({
        where: { stock_code: 'LOT_BLANK_SOLITAIRE_WG18K' },
        update: { quantity_on_hand: 20 },
        create: {
          id: randomUUID(),
          stock_code: 'LOT_BLANK_SOLITAIRE_WG18K',
          stock_type: 'RING_BLANK',
          template_variant_id: solitaireWG18KVariantId,
          lot_code: 'BATCH-2026-WG18K',
          quantity_on_hand: 20,
          quantity_reserved: 0,
          unit_cost: new Prisma.Decimal(5000000),
          location_code: 'STORE_HN_01',
          status: 'ACTIVE',
          updated_at: new Date(),
        },
      });
    }

    // Lô đá Moissanite
    if (moisGemId) {
      await prisma.stock_lots.upsert({
        where: { stock_code: 'LOT_GEM_MOIS_050' },
        update: { quantity_on_hand: 50 },
        create: {
          id: randomUUID(),
          stock_code: 'LOT_GEM_MOIS_050',
          stock_type: 'GEMSTONE',
          gemstone_option_id: moisGemId,
          lot_code: 'MOIS-LOT-01',
          quantity_on_hand: 50,
          quantity_reserved: 0,
          unit_cost: new Prisma.Decimal(1200000),
          location_code: 'STORE_HN_01',
          status: 'ACTIVE',
          updated_at: new Date(),
        },
      });
    }

    // Lô đá Kim cương tự nhiên kèm viên chứng chỉ GIA
    if (natDiaGemId) {
      await prisma.stock_lots.upsert({
        where: { stock_code: 'LOT_GEM_NAT_DIA_GIA' },
        update: { quantity_on_hand: 5 },
        create: {
          id: randomUUID(),
          stock_code: 'LOT_GEM_NAT_DIA_GIA',
          stock_type: 'GEMSTONE',
          gemstone_option_id: natDiaGemId,
          lot_code: 'GIA-BATCH-2026',
          quantity_on_hand: 5,
          quantity_reserved: 0,
          unit_cost: new Prisma.Decimal(18000000),
          location_code: 'SAFE_HN_01',
          status: 'ACTIVE',
          updated_at: new Date(),
        },
      });

      // 2 viên chứng chỉ GIA
      const giaStones = [
        {
          code: 'GIA-2487654321',
          certNum: '2487654321',
          carat: new Prisma.Decimal(0.51),
        },
        {
          code: 'GIA-2487654322',
          certNum: '2487654322',
          carat: new Prisma.Decimal(0.52),
        },
      ];

      for (const stone of giaStones) {
        const existingStone = await prisma.certified_gemstones.findFirst({
          where: { internal_code: stone.code },
        });

        if (!existingStone) {
          await prisma.certified_gemstones.create({
            data: {
              id: randomUUID(),
              gemstone_option_id: natDiaGemId,
              internal_code: stone.code,
              certificate_provider: 'GIA',
              certificate_number: stone.certNum,
              certificate_url: `https://www.gia.edu/report-check?reportno=${stone.certNum}`,
              certificate_metadata_json: {
                carat_weight: 0.51,
                color_grade: 'F',
                clarity_grade: 'VVS1',
                cut_grade: 'EXCELLENT',
                shape: 'ROUND',
              },
              purchase_cost: new Prisma.Decimal(15000000),
              location_code: 'SAFE_HN_01',
              status: 'AVAILABLE',
              updated_at: new Date(),
            },
          });
          console.log(`  - Certified Stone ${stone.code} created`);
        }
      }
    }

    console.log('[commerce-seed] Master Data Seed Completed Successfully!');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[commerce-seed] Failed:', err);
  process.exit(1);
});
