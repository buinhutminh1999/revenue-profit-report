// File: functions/dataProcessing.js

const {getFirestore} = require("firebase-admin/firestore");

const toNum = (value) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
        const num = parseFloat(value.replace(/,/g, ""));
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

const closeQuarterAndCarryOver = async (year, quarter) => {
    const db = getFirestore();
    console.log(`Bắt đầu quá trình khóa sổ cho Q${quarter}/${year}...`);

    let nextQuarter = quarter + 1;
    let nextYear = year;
    if (nextQuarter > 4) {
        nextQuarter = 1;
        nextYear = year + 1;
    }
    console.log(`Số dư sẽ được kết chuyển sang Q${nextQuarter}/${nextYear}.`);

    try {
        const projectsSnapshot = await db.collection("projects").get();
        const projects = projectsSnapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        }));

        for (const project of projects) {
            const currentQuarterPath = `projects/${project.id}/years/${year}/quarters/Q${quarter}`;
            const currentQuarterDocRef = db.doc(currentQuarterPath);
            const currentQuarterDocSnap = await currentQuarterDocRef.get();

            if (!currentQuarterDocSnap.exists) {
                console.log(
                    `Công trình ${project.name} không có dữ liệu cho Q${quarter}/${year}. Bỏ qua.`,
                );
                continue;
            }

            const items = currentQuarterDocSnap.data().items || [];
            const nextQuarterItems = [];

            for (const item of items) {
                const creditValue =
                    item.quarterlyOverallRevenue === 0 ?
                        toNum(item.directCost) :
                        toNum(item.debt);
                const dauKyNo = toNum(item.debt);
                const dauKyCo = toNum(item.openingCredit);
                const psNo = toNum(item.noPhaiTraCK);
                const psGiam = creditValue;

                const cuoiKyNo = Math.max(dauKyNo + psNo - psGiam - dauKyCo, 0);
                const cuoiKyCo = Math.max(dauKyCo + psGiam - dauKyNo - psNo, 0);

                nextQuarterItems.push({
                    ...item,
                    debt: cuoiKyNo,
                    openingCredit: cuoiKyCo,
                    noPhaiTraCK: 0,
                    directCost: 0,
                });
            }

            const nextQuarterPath = `projects/${project.id}/years/${nextYear}/quarters/Q${nextQuarter}`;
            const nextQuarterDocRef = db.doc(nextQuarterPath);

            await nextQuarterDocRef.set(
                {
                    items: nextQuarterItems,
                    overallRevenue: 0,
                },
                {merge: true},
            );

            console.log(
                `✅ Đã kết chuyển thành công cho công trình: ${project.name}`,
            );
        }

        console.log("🎉 Hoàn tất quá trình khóa sổ!");
        return {
            success: true,
            message: `Đã khóa sổ thành công Q${quarter}/${year}.`,
        };
    } catch (error) {
        console.error("❌ Lỗi nghiêm trọng trong quá trình khóa sổ:", error);
        throw error;
    }
};

module.exports = {closeQuarterAndCarryOver};
