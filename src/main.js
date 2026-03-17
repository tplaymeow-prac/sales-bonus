/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;

    const discountPercent = discount/100;
    const totalPurchase = sale_price * quantity;

    return totalPurchase * (1 - discountPercent);
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    if (index === 0) {
        return profit * 0.15;
    } else if (index === 1 || index === 2) {
        return profit * 0.1;
    } else if (index !== (total-1)) {
        return  profit * 0.05;
    } else {
        return 0;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {

    // // @TODO: Проверка входных данных
    if (!data
        || (!Array.isArray(data.sellers) || !Array.isArray(data.products) || !Array.isArray(data.purchase_records))
        || (data.sellers.length === 0 || data.products.length === 0 || data.purchase_records.length === 0)
    ) {
        throw new Error('Некорректные входные данные');
    }

    const { calculateRevenue, calculateBonus } = options;

    if (calculateRevenue === undefined || calculateBonus === undefined) {
        throw new Error('Чего-то не хватает');
    }

    let mappedData = new Map();
    data.purchase_records.forEach(record => {
        if (!mappedData.has(record.seller_id)) {
            mappedData.set(record.seller_id, {
                seller_id: record.seller_id,
                name: `${data.sellers.find(element => {
                    return element.id === record.seller_id;
                }).first_name} ${data.sellers.find(element => {
                    return element.id === record.seller_id;
                }).last_name}`,
                revenue: 0, // ok
                profit: 0, // ok
                sales_count: 0, // ok
                bonus: 0,
                products_sold: new Map(),
            });
        }
        mappedData.get(record.seller_id).sales_count+=1;
        mappedData.get(record.seller_id).revenue+=record.total_amount;

        record.items.forEach(item => {
            const product = data.products.find(element => {
                return element.sku === item.sku;
            }); // Товар
            // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
            let cost = product.purchase_price * item.quantity;
            // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
            let revenue = calculateRevenue(item);
            // Посчитать прибыль: выручка минус себестоимость
            // Увеличить общую накопленную прибыль (profit) у продавца
            mappedData.get(record.seller_id).profit+= (revenue - cost);

            if (!mappedData.get(record.seller_id).products_sold.has(item.sku)) {
                mappedData.get(record.seller_id).products_sold.set(item.sku, 0);
            }
            mappedData.get(record.seller_id).products_sold.set(item.sku, mappedData.get(record.seller_id).products_sold.get(item.sku) + 1);
        })
    })

    let sortedData = [...mappedData.entries()]
        .sort((a, b) => {
            if (a[1].profit > b[1].profit) {
                return -1;
            } else if (a[1].profit === b[1].profit) {
                return 0;
            } else {
                return 1;
            }
        });

    sortedData.forEach(([sellerId, seller], index) => {
        seller.bonus = calculateBonus(index, sortedData.length, seller);
        const productsBySku = new Map(
            data.products.map(product => [product.sku, product])
        );
        seller.top_products = [...seller.products_sold.entries()]
            .slice(0, 10)
            .map(([sku]) => {
                return productsBySku.get(sku);
            });
    });

    return sortedData.map(([seller_id, entry]) => ({
        seller_id,
        name: entry.name,
        revenue: +entry.revenue.toFixed(2),
        profit: +entry.profit.toFixed(2),
        sales_count: entry.sales_count,
        top_products: entry.top_products,
        bonus: +entry.bonus.toFixed(2),
    }));

}