import { parseNumber } from "./numberUtils";

// ---------- Calculation Functions ----------

const calcCarryoverMinus = ({ directCost, allocated, revenue, carryover }) => {
    const dc = Number(parseNumber(directCost)),
        al = Number(parseNumber(allocated)),
        rev = Number(parseNumber(revenue)),
        car = Number(parseNumber(carryover));
    if (dc + al > rev) return "0";
    const remain = rev - (dc + al);
    return String(remain < car ? remain : car);
};

// H├ám t├¡nh to├ín mß╗¢i cho "CP Trß╗½ V├áo Chuyß╗ân Tiß║┐p"
const calcPayableDeductionThisQuarter = (row) => {
    const directCost = Number(parseNumber(row.directCost || "0"));
    const revenue = Number(parseNumber(row.revenue || "0"));
    const carryover = Number(parseNumber(row.carryover || "0"));

    // if(Chi Ph├¡ Trß╗▒c Tiß║┐p > Doanh Thu; 0; ...)
    if (directCost > revenue) {
        return "0";
    }

    const revenueMinusDirectCost = revenue - directCost;

    // if(...; if(Doanh Thu - Chi Ph├¡ Trß╗▒c Tiß║┐p < Chuyß╗ân Tiß║┐p ─ÉK; Doanh Thu - Chi Ph├¡ Trß╗▒c Tiß║┐p; Chuyß╗ân Tiß║┐p ─ÉK))
    if (revenueMinusDirectCost < carryover) {
        return String(revenueMinusDirectCost);
    } else {
        return String(carryover);
    }
};

const calcCarryoverEnd = (row, projectType) => {
    // Nß║┐u l├á dß╗▒ ├ín "Nh├á m├íy", ├íp dß╗Ñng c├┤ng thß╗⌐c mß╗¢i
    if (projectType === "Nh├á m├íy") {
        const carryover = Number(parseNumber(row.carryover || "0"));
        const carryoverMinus = Number(parseNumber(row.carryoverMinus || "0"));
        const cpVuot = Number(parseNumber(row.cpVuot || "0"));
        return String(carryover - carryoverMinus + cpVuot);
    }

    // Nß║┐u kh├┤ng, giß╗» nguy├¬n c├┤ng thß╗⌐c c┼⌐
    const dc = Number(parseNumber(row.directCost)),
        al = Number(parseNumber(row.allocated)),
        rev = Number(parseNumber(row.revenue)),
        car = Number(parseNumber(row.carryover)),
        carMinus = Number(parseNumber(row.carryoverMinus)),
        part1 = rev === 0 ? 0 : rev < dc + al ? dc + al - rev : 0;
    return String(part1 + car - carMinus);
};

const calcNoPhaiTraCK = (row, projectType) => {
    const carMinus = Number(parseNumber(row.carryoverMinus || "0"));
    const dc = Number(parseNumber(row.directCost || "0"));
    const al = Number(parseNumber(row.allocated || "0"));
    const rev = Number(parseNumber(row.revenue || "0"));
    const debt = Number(parseNumber(row.debt || "0"));
    // Mß╗ÜI: Lß║Ñy th├¬m gi├í trß╗ï tß╗½ cß╗Öt "Nß╗ú phß║úi trß║ú CK NM"
    const noCKNM = Number(parseNumber(row.noPhaiTraCKNM || "0"));

    // =================================================================
    // Cß║¼P NHß║¼T LOGIC CHO Dß╗░ ├üN "NH├Ç M├üY" THEO Y├èU Cß║ªU
    // =================================================================
    if (projectType === "Nh├á m├íy") {
        // ─Éiß╗üu kiß╗çn A ─æ╞░ß╗úc cß║¡p nhß║¡t ─æß╗â bao gß╗ôm noCKNM
        const conditionA = carMinus + dc + al + noCKNM - debt;
        const conditionB = rev;

        if (conditionA < conditionB) {
            // C├┤ng thß╗⌐c t├¡nh kß║┐t quß║ú c┼⌐ng ─æ╞░ß╗úc cß║¡p nhß║¡t ─æß╗â bao gß╗ôm noCKNM
            const result = rev - carMinus - dc - al - noCKNM + debt;
            return String(result);
        } else {
            return "0"; // Trß║ú vß╗ü 0 nß║┐u ─æiß╗üu kiß╗çn sai
        }
    }
    // =================================================================
    // GIß╗« NGUY├èN: Logic c┼⌐ cho c├íc loß║íi dß╗▒ ├ín kh├íc
    // =================================================================
    else {
        if (rev === 0) {
            return String(debt - dc);
        }

        const part1 = carMinus + dc + al < rev ? rev - (dc + al) - carMinus : 0;
        return String(part1 + debt);
    }
};

const calcTotalCost = (row) => {
    const dc = Number(parseNumber(row.directCost)),
        al = Number(parseNumber(row.allocated)),
        rev = Number(parseNumber(row.revenue)),
        inv = Number(parseNumber(row.inventory)),
        debt = Number(parseNumber(row.debt)),
        ton = Number(parseNumber(row.tonKhoUngKH)),
        noCK = Number(parseNumber(row.noPhaiTraCK)),
        proj = (row.project || "").toUpperCase();
    // Γ£à LOGIC Mß╗ÜI: Tß║Ñt cß║ú c├┤ng tr├¼nh KH├öNG c├│ -CP ─æ╞░ß╗úc xß╗¡ l├╜ nh╞░ VT/NC
    const isCpProject = proj.includes("-CP");
    return !isCpProject
        ? String(inv - debt + dc + al + noCK - ton)
        : String(rev === 0 ? dc + al : rev);
};

const calcCpVuot = (row) => {
    const directCost = Number(parseNumber(row.directCost || "0"));
    const allocated = Number(parseNumber(row.allocated || "0"));
    const debt = Number(parseNumber(row.debt || "0"));
    const revenue = Number(parseNumber(row.revenue || "0"));
    // Mß╗ÜI: Lß║Ñy th├¬m gi├í trß╗ï tß╗½ cß╗Öt "Nß╗ú phß║úi trß║ú CK NM"
    const noCKNM = Number(parseNumber(row.noPhaiTraCKNM || "0"));

    // T├¡nh to├ín gi├í trß╗ï cß╗æt l├╡i theo c├┤ng thß╗⌐c cß╗ºa bß║ín
    const result = directCost + allocated + noCKNM - debt - revenue;

    // Sß╗¡ dß╗Ñng Math.max ─æß╗â ─æß║úm bß║úo kß║┐t quß║ú kh├┤ng bao giß╗¥ l├á sß╗æ ├óm
    return String(Math.max(0, result));
};

// C├┤ng thß╗⌐c t├¡nh Ch├¬nh Lß╗çch cho "Thi c├┤ng" v├á "KH-─ÉT"
// DOANH THU - (DOANH THU - PHß║óI TRß║ó - CHUYß╗éN TIß║╛P ─ÉK + Nß╗ó PHß║óI TRß║ó ─ÉK - CHI PH├ì TRß╗░C TIß║╛P)
// = PHß║óI TRß║ó + CHUYß╗éN TIß║╛P ─ÉK - Nß╗ó PHß║óI TRß║ó ─ÉK + CHI PH├ì TRß╗░C TIß║╛P
const calcChenhLech = (row) => {
    const phaiTra = Number(parseNumber(row.phaiTra || "0"));

    // Nß║┐u Phß║úi Trß║ú = 0 th├¼ Ch├¬nh Lß╗çch = 0
    if (phaiTra === 0) {
        return "0";
    }

    const carryover = Number(parseNumber(row.carryover || "0"));
    const debt = Number(parseNumber(row.debt || "0"));
    const directCost = Number(parseNumber(row.directCost || "0"));

    return String(phaiTra + carryover - debt + directCost);
};

export const calcAllFields = (
    row,
    {
        isUserEditingNoPhaiTraCK = false,
        overallRevenue = "0",
        projectTotalAmount = "0",
        projectType = "",
        year = "",
        quarter = "",
        isProjectFinalized = false, // Γ£à Mß╗ÜI: Th├¬m cß╗¥ ─æ├ú quyß║┐t to├ín
    } = {}
) => {
    // Γ£à LOGIC Mß╗ÜI: ├üp dß╗Ñng c├┤ng thß╗⌐c VT/NC cho Tß║ñT Cß║ó c├┤ng tr├¼nh KH├öNG c├│ ─æu├┤i -CP
    // Bao gß╗ôm: -VT, -NC, hoß║╖c bß║Ñt kß╗│ c├┤ng tr├¼nh n├áo kh├┤ng c├│ -CP (─æu├┤i trß╗æng, -abc, -xyz, v.v.)
    if (!row.project) return;

    const isCpProject = row.project.includes("-CP");
    const isVtNcProject = !isCpProject; // Tß║Ñt cß║ú c├┤ng tr├¼nh kh├┤ng phß║úi -CP ─æ╞░ß╗úc xß╗¡ l├╜ nh╞░ VT/NC

    // Γ¡É LOGIC Mß╗ÜI ╞»U TI├èN H├ÇNG ─Éß║ªU: ├üP Dß╗ñNG C├öNG THß╗¿C "Sß╗ÉNG" Γ¡É
    // Kiß╗âm tra nß║┐u l├á c├┤ng tr├¼nh VT/NC v├á c├│ tr╞░ß╗¥ng 'baseForNptck' ─æ╞░ß╗úc truyß╗ün tß╗½ qu├╜ tr╞░ß╗¢c.
    // Γ£à CHß╗ê ├íp dß╗Ñng c├┤ng thß╗⌐c Tß╗░ ─Éß╗ÿNG nß║┐u ng╞░ß╗¥i d├╣ng KH├öNG ─æang chß╗ënh sß╗¡a noPhaiTraCK
    // Γ£à Mß╗ÜI: Bß╗Å qua nß║┐u row ─æ├ú ─æ╞░ß╗úc ─æ├ính dß║Ñu l├á chß╗ënh sß╗¡a thß╗º c├┤ng
    if (!isUserEditingNoPhaiTraCK && !row.isNoPhaiTraCKManual && isVtNcProject && row.hasOwnProperty('baseForNptck') && row.baseForNptck !== null) {
        // Lß║Ñy gi├í trß╗ï gß╗æc ─æ├ú t├¡nh ß╗ƒ qu├╜ tr╞░ß╗¢c
        const baseValue = Number(parseNumber(row.baseForNptck));
        // Lß║Ñy Chi Ph├¡ Trß╗▒c Tiß║┐p cß╗ºa qu├╜ HIß╗åN Tß║áI (khi ng╞░ß╗¥i d├╣ng nhß║¡p)
        const directCost_Current = Number(parseNumber(row.directCost || "0"));

        // C├┤ng thß╗⌐c cuß╗æi c├╣ng: NPT─ÉK(Q2) - CPTT(Q2) - CPTT(Q3)
        row.noPhaiTraCK = String(baseValue - directCost_Current);
    }

    // Γ£à Mß╗ÜI: Nß║┐u user ─æang edit, ─æ├ính dß║Ñu row ─æ├ú ─æ╞░ß╗úc chß╗ënh sß╗¡a thß╗º c├┤ng
    if (isUserEditingNoPhaiTraCK && isVtNcProject) {
        row.isNoPhaiTraCKManual = true;
    }

    // C├íc logic t├¡nh to├ín kh├íc giß╗» nguy├¬n
    if (isVtNcProject) {
        row.revenue = "0";
    } else if (row.project.includes("-CP")) {
        if (!row.isRevenueManual) {
            const hskh = Number(parseNumber(row.hskh));
            const orv = Number(parseNumber(overallRevenue));
            const pta = Number(parseNumber(projectTotalAmount));
            row.revenue = pta === 0 ? "0" : String((hskh * orv) / pta);
        }
    }

    // C├┤ng thß╗⌐c t├¡nh Ch├¬nh Lß╗çch tß╗▒ ─æß╗Öng cho "Thi c├┤ng" v├á "KH-─ÉT"
    if (projectType === "Thi c├┤ng" || projectType === "KH-─ÉT") {
        row.chenhLech = calcChenhLech(row);

        // Tß╗½ Q4/2025 trß╗ƒ ─æi: Nß║┐u Ch├¬nh Lß╗çch != 0, Doanh Thu = Ch├¬nh Lß╗çch
        const yearNum = Number(year);
        // Parse quarter: "Q4" -> 4, "4" -> 4
        const quarterStr = String(quarter).replace(/[Qq]/g, '');
        const quarterNum = Number(quarterStr);
        const isQ4_2025OrLater = (yearNum > 2025) || (yearNum === 2025 && quarterNum >= 4);

        // DEBUG: Log ─æß╗â kiß╗âm tra
        console.log('DEBUG ChenhLech Override:', {
            project: row.project,
            projectType,
            year, quarter,
            yearNum, quarterNum,
            isQ4_2025OrLater,
            isCpProject,
            chenhLech: row.chenhLech,
        });

        if (isQ4_2025OrLater && isCpProject) {
            const chenhLechValue = Number(parseNumber(row.chenhLech || "0"));
            if (chenhLechValue !== 0) {
                row.revenue = String(chenhLechValue);
                console.log('DEBUG: Revenue overridden to', row.revenue);
            }
        }
    }

    if (projectType === "Nh├á m├íy") {
        row.payableDeductionThisQuarter = calcPayableDeductionThisQuarter(row);
    }

    row.carryoverMinus = calcCarryoverMinus(row);

    // Γ£à ─Éß║╢C BIß╗åT: C├┤ng thß╗⌐c Tß╗öNG CHI PH├ì cho -VT, -NC thuß╗Öc THI C├öNG
    // ─Éiß╗üu kiß╗çn 1: Nß║┐u CPTT > 0 ΓåÆ d├╣ng c├┤ng thß╗⌐c (debt - directCost - noPhaiTraCK), nß║┐u ├óm lß║Ñy 0
    // ─Éiß╗üu kiß╗çn 2: Nß║┐u CPTT <= 0 ΓåÆ lß║Ñy -directCost (trß╗½ ch├¡nh n├│)
    if (isVtNcProject && projectType === "Thi c├┤ng") {
        const dc = Number(parseNumber(row.directCost || "0"));
        const debt = Number(parseNumber(row.debt || "0"));
        const noCK = Number(parseNumber(row.noPhaiTraCK || "0"));

        if (dc > 0) {
            const result = debt - dc - noCK;
            row.totalCost = String(Math.max(0, result));
        } else {
            row.totalCost = String(-dc);
        }
    } else if (!isVtNcProject && projectType === "Thi c├┤ng") {
        // Γ£à ─Éß║╢C BIß╗åT: C├┤ng thß╗⌐c Tß╗öNG CHI PH├ì cho -CP thuß╗Öc THI C├öNG
        // IF(DOANH THU = 0, Nß╗ó PHß║óI TRß║ó ─ÉK - CPTT - Nß╗ó PHß║óI TRß║ó CK + CUß╗ÉI Kß╗▓, DOANH THU)
        const dc = Number(parseNumber(row.directCost || "0"));
        const debt = Number(parseNumber(row.debt || "0"));
        const noCK = Number(parseNumber(row.noPhaiTraCK || "0"));
        const carryoverEnd = Number(parseNumber(row.carryoverEnd || "0"));
        const rev = Number(parseNumber(row.revenue || "0"));

        if (rev === 0) {
            row.totalCost = String(debt - dc - noCK + carryoverEnd);
        } else {
            row.totalCost = String(rev);
        }
    } else {
        row.totalCost = calcTotalCost(row);
    }

    if (isVtNcProject) {
        row.cpVuot = "0";
    } else {
        row.cpVuot = calcCpVuot(row);
    }

    // Γ£à LU├öN t├¡nh lß║íi carryoverEnd (bß╗Å ─æiß╗üu kiß╗çn isFinalized ─æß╗â ─æß║úm bß║úo gi├í trß╗ï lu├┤n ─æ├║ng)
    row.carryoverEnd = calcCarryoverEnd(row, projectType);

    // Chß╗ë t├¡nh NPT CK tß╗▒ ─æß╗Öng cho c├íc dß╗▒ ├ín -CP (kh├┤ng phß║úi VT/NC)
    // Γ£à FIX: Bß╗Å qua khi ─æ├ú quyß║┐t to├ín ─æß╗â giß╗» gi├í trß╗ï ─æ├ú l╞░u
    if (!isUserEditingNoPhaiTraCK && !isVtNcProject && row.project.includes("-CP") && !isProjectFinalized) {
        row.noPhaiTraCK = calcNoPhaiTraCK(row, projectType);
    }

    const directCost = parseNumber(row.directCost || "0");
    const allocated = parseNumber(row.allocated || "0");
    const debt = parseNumber(row.debt || "0"); // Lß║Ñy gi├í trß╗ï NPT ─ÉK

    // ≡ƒÆí Bß║«T ─Éß║ªU LOGIC KHß║«C PHß╗ñC
    const isStandardProject = row.project.includes("-CP") || isVtNcProject;
    let noPhaiTraCK = parseNumber(row.noPhaiTraCK || "0"); // Sß╗¡ dß╗Ñng gi├í trß╗ï ─æ├ú t├¡nh hoß║╖c 0

    if (!isStandardProject) {
        // ─Éß╗æi vß╗¢i c├┤ng tr├¼nh t├╣y chß╗ënh (CHIPHIPHAITRAKHAC), 
        // ch├║ng ta buß╗Öc NPT CK = NPT ─ÉK ─æß╗â triß╗çt ti├¬u nhau.
        noPhaiTraCK = debt;
    }
    // ≡ƒÆí Kß║╛T TH├ÜC LOGIC KHß║«C PHß╗ñC

    const carryoverEnd = parseNumber(row.carryoverEnd || "0");
    const inventory = parseNumber(row.inventory || "0");

    // Ghi lß║íi noPhaiTraCK ─æ├ú ─æiß╗üu chß╗ënh v├áo row (quan trß╗ìng cho hiß╗ân thß╗ï v├á l╞░u DB)
    row.noPhaiTraCK = String(noPhaiTraCK);

    // D├▓ng 232: C├┤ng thß╗⌐c t├¡nh CP Sau Quyß║┐t To├ín
    // Γ£à Mß╗ÜI: Chß╗ë t├¡nh to├ín nß║┐u ─æ├ú Quyß║┐t to├ín (isProjectFinalized = true)
    if (!isProjectFinalized) {
        row.cpSauQuyetToan = "0";
    } else {
        // Γ£à ─Éß║╢C BIß╗åT: C├┤ng thß╗⌐c cho -VT, -NC (VT/NC projects) thuß╗Öc THI C├öNG
        // ─Éiß╗üu kiß╗çn 1: Nß║┐u CPTT > 0 ΓåÆ d├╣ng c├┤ng thß╗⌐c (debt - directCost - noPhaiTraCK), nß║┐u ├óm lß║Ñy 0
        // ─Éiß╗üu kiß╗çn 2: Nß║┐u CPTT <= 0 ΓåÆ lß║Ñy -directCost (trß╗½ ch├¡nh n├│)
        if (isVtNcProject && projectType === "Thi c├┤ng") {
            if (directCost > 0) {
                const result = debt - directCost - noPhaiTraCK;
                row.cpSauQuyetToan = String(Math.max(0, result));
            } else {
                row.cpSauQuyetToan = String(-directCost);
            }
        } else if (!isVtNcProject && projectType === "Thi c├┤ng") {
            // Γ£à ─Éß║╢C BIß╗åT: -CP thuß╗Öc THI C├öNG ΓåÆ cpSauQuyetToan = totalCost
            row.cpSauQuyetToan = row.totalCost;
        } else {
            // C├┤ng thß╗⌐c chung cho c├íc loß║íi kh├íc:
            // CP Sau Quyß║┐t To├ín = Nß╗ú phß║úi trß║ú ─ÉK - CPTT - Nß╗ú phß║úi trß║ú CK - Ph├ón bß╗ò - Chuyß╗ân tiß║┐p DK + Doanh thu
            const carryover = parseNumber(row.carryover || "0");
            const revenue = parseNumber(row.revenue || "0");
            row.cpSauQuyetToan = String(
                debt - directCost - noPhaiTraCK - allocated - carryover + revenue
            );
        }
    }
};

// ---------- Hidden Columns Helper ----------
// Γ£à LOGIC Mß╗ÜI: ß║¿n c├íc cß╗Öt cho Tß║ñT Cß║ó c├┤ng tr├¼nh KH├öNG c├│ ─æu├┤i -CP
export const getHiddenColumnsForProject = (project) => {
    const proj = (project || "").toUpperCase();
    const isCpProject = proj.includes("-CP");
    return !isCpProject
        ? ["allocated", "carryover", "carryoverMinus", "carryoverEnd", "hskh", "revenue", "cpVuot", "phaiTra", "chenhLech"]
        : [];
};

// =================================================================
// Kß║╛T TH├ÜC KHß╗ÉI CODE THAY THß║╛
// =================================================================
// ---------- Hidden Columns Helper (cho -VT, -NC) ----------
