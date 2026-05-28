// ── AI Engine ─────────────────────────────────────────────────────
// Client-side NLP parsing, smart categorisation, and insight generation.

import {
  CATEGORIES, getCategoryById, parseRelativeDate, toISODate,
  getMonthName, groupBy, sumBy, formatCurrency,
} from './utils.js';

// ── Category Keyword Dictionaries ─────────────────────────────────

const CATEGORY_KEYWORDS = {
  food: [
    'restaurant','dinner','lunch','breakfast','brunch','cafe','coffee',
    'pizza','burger','sushi','taco','noodle','steak','bbq','bakery',
    'donut','ice cream','dessert','food truck','diner','bistro',
    'mcdonald','kfc','subway','chipotle','starbucks','dunkin',
    'wendy','domino','panda express','chick-fil-a','eat','meal',
    'snack','takeout','delivery','grubhub','doordash','uber eats',
  ],
  groceries: [
    'grocery','groceries','supermarket','walmart','costco','kroger',
    'aldi','trader joe','whole foods','safeway','target','market',
    'produce','vegetables','fruits','meat','dairy','pantry',
  ],
  transport: [
    'uber','lyft','taxi','cab','gas','fuel','petrol','parking',
    'toll','metro','subway','bus','train','transit','fare',
    'car wash','mechanic','auto','vehicle','tire','oil change',
    'registration','insurance car',
  ],
  shopping: [
    'amazon','ebay','clothing','shoes','sneakers','dress','shirt',
    'pants','jacket','accessories','jewelry','watch','electronics',
    'gadget','phone','laptop','tablet','headphones','speaker',
    'furniture','decor','home depot','ikea','mall','store','shop',
    'online','purchase','bought','buy',
  ],
  bills: [
    'rent','mortgage','electricity','electric','water','gas bill',
    'internet','wifi','phone bill','cable','insurance','tax',
    'payment','utility','utilities','hoa','maintenance',
  ],
  entertainment: [
    'movie','cinema','theater','theatre','concert','show','ticket',
    'netflix','hulu','disney','spotify','apple music','youtube',
    'gaming','game','playstation','xbox','nintendo','steam',
    'bar','pub','club','drinks','beer','wine','cocktail','party',
    'bowling','arcade','amusement','museum','zoo',
  ],
  health: [
    'doctor','hospital','clinic','pharmacy','medicine','drug',
    'prescription','dental','dentist','eye','optometrist','therapy',
    'counseling','gym','fitness','workout','yoga','supplement',
    'vitamin','health','medical','copay','insurance health',
  ],
  education: [
    'tuition','school','college','university','course','class',
    'book','textbook','udemy','coursera','tutorial','workshop',
    'seminar','training','certification','exam','test','study',
    'library','supplies','stationery',
  ],
  travel: [
    'flight','airline','hotel','motel','airbnb','hostel','resort',
    'vacation','trip','travel','booking','passport','visa','luggage',
    'cruise','rental car','road trip','souvenir',
  ],
  subscriptions: [
    'subscription','membership','premium','annual','monthly plan',
    'renewal','patreon','saas','cloud storage','dropbox','icloud',
  ],
};

// ── Natural Language Parser ───────────────────────────────────────

export function parseNaturalLanguage(input) {
  const result = {
    amount: null,
    description: '',
    category: 'other',
    date: toISODate(new Date()),
    confidence: 0,
    raw: input,
  };

  if (!input || !input.trim()) return result;

  let text = input.trim();

  // 1) Extract amount — match $45, $45.50, 45 dollars, USD 45, just 45.50 etc.
  const amountPatterns = [
    /\$\s*([\d,]+(?:\.\d{1,2})?)/,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:dollars?|usd|bucks)/i,
    /(?:spent|paid|cost|charged|was)\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /\b([\d,]+\.\d{1,2})\b/,                     // decimal number
    /(?:for|of|about|around|roughly)\s*\$?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.amount = parseFloat(match[1].replace(/,/g, ''));
      // Remove the amount from text for description extraction
      text = text.replace(match[0], ' ').trim();
      break;
    }
  }

  // Fallback: find any number
  if (result.amount === null) {
    const numMatch = text.match(/\b(\d+(?:\.\d{1,2})?)\b/);
    if (numMatch) {
      result.amount = parseFloat(numMatch[1]);
      text = text.replace(numMatch[0], ' ').trim();
    }
  }

  // 2) Extract date
  const parsedDate = parseRelativeDate(input);
  if (parsedDate) {
    result.date = parsedDate;
    // Remove date-related words from text
    const dateWords = /\b(today|yesterday|last\s+\w+|\d+\s*days?\s*ago|\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2})\b/gi;
    text = text.replace(dateWords, ' ').trim();
  }

  // 3) Clean up description — remove filler words
  const fillerWords = /\b(spent|paid|on|for|at|the|a|an|my|about|around|roughly|approximately|some|bought|got|was|cost|charged|i|had|have|to|with|and|just)\b/gi;
  let desc = text.replace(fillerWords, ' ').replace(/\s+/g, ' ').trim();

  // Capitalize first letter
  if (desc.length > 0) {
    desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  }
  result.description = desc || 'Expense';

  // 4) Auto-categorize
  const catResult = categorizeExpense(input);
  result.category = catResult.category;
  result.confidence = catResult.confidence;

  return result;
}

// ── Smart Categoriser ─────────────────────────────────────────────

export function categorizeExpense(description) {
  const lower = description.toLowerCase();
  const scores = {};

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        // Longer keywords are more specific → higher score
        score += keyword.length;
      }
    }
    if (score > 0) scores[category] = score;
  }

  // Find best match
  const entries = Object.entries(scores);
  if (entries.length === 0) {
    return { category: 'other', confidence: 0.1 };
  }

  entries.sort((a, b) => b[1] - a[1]);
  const topScore = entries[0][1];
  const totalScore = entries.reduce((s, e) => s + e[1], 0);

  return {
    category: entries[0][0],
    confidence: Math.min(topScore / Math.max(totalScore, 1), 1),
    alternatives: entries.slice(1, 3).map(e => e[0]),
  };
}

// ── Spending Insights Engine ──────────────────────────────────────

export function generateInsights(expenses, currency = 'USD') {
  if (!expenses || expenses.length === 0) {
    return [{
      type: 'info',
      icon: '💡',
      title: 'Getting Started',
      message: 'Add your first expense using the AI input bar above. Try typing something like "Spent $15 on lunch today"!',
    }];
  }

  const insights = [];
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  // Current month expenses
  const currentMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  // Last month expenses
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
  const lastMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
  });

  const currentTotal = sumBy(currentMonthExpenses, 'amount');
  const lastTotal = sumBy(lastMonthExpenses, 'amount');

  // 1) Month-over-month comparison
  if (lastTotal > 0) {
    const pctChange = ((currentTotal - lastTotal) / lastTotal) * 100;
    if (pctChange > 20) {
      insights.push({
        type: 'warning',
        icon: '📈',
        title: 'Spending Increase',
        message: `You've spent ${formatCurrency(currentTotal, currency)} this month — that's ${Math.abs(pctChange).toFixed(0)}% more than last month (${formatCurrency(lastTotal, currency)}).`,
      });
    } else if (pctChange < -10) {
      insights.push({
        type: 'success',
        icon: '📉',
        title: 'Great Saving!',
        message: `Your spending is down ${Math.abs(pctChange).toFixed(0)}% compared to last month. Keep it up!`,
      });
    }
  }

  // 2) Top spending category
  if (currentMonthExpenses.length > 0) {
    const byCategory = groupBy(currentMonthExpenses, 'category');
    let topCat = null, topAmount = 0;
    for (const [cat, exps] of Object.entries(byCategory)) {
      const total = sumBy(exps, 'amount');
      if (total > topAmount) { topCat = cat; topAmount = total; }
    }
    if (topCat) {
      const catInfo = getCategoryById(topCat);
      insights.push({
        type: 'info',
        icon: catInfo.icon,
        title: 'Top Category',
        message: `${catInfo.name} is your biggest expense this month at ${formatCurrency(topAmount, currency)} (${((topAmount / currentTotal) * 100).toFixed(0)}% of total).`,
      });
    }
  }

  // 3) Projected spending
  if (currentMonthExpenses.length >= 3) {
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(thisYear, thisMonth + 1, 0).getDate();
    const dailyAvg = currentTotal / dayOfMonth;
    const projected = dailyAvg * daysInMonth;

    insights.push({
      type: projected > currentTotal * 1.5 ? 'warning' : 'info',
      icon: '🔮',
      title: 'Projected Spending',
      message: `At your current pace, you'll spend about ${formatCurrency(projected, currency)} this month (${formatCurrency(dailyAvg, currency)}/day average).`,
    });
  }

  // 4) Category comparisons vs last month
  if (lastMonthExpenses.length > 0 && currentMonthExpenses.length > 0) {
    const currentByCat = groupBy(currentMonthExpenses, 'category');
    const lastByCat = groupBy(lastMonthExpenses, 'category');

    for (const [cat, exps] of Object.entries(currentByCat)) {
      const currentCatTotal = sumBy(exps, 'amount');
      const lastCatTotal = lastByCat[cat] ? sumBy(lastByCat[cat], 'amount') : 0;

      if (lastCatTotal > 0) {
        const change = ((currentCatTotal - lastCatTotal) / lastCatTotal) * 100;
        if (change > 50 && currentCatTotal > 50) {
          const catInfo = getCategoryById(cat);
          insights.push({
            type: 'warning',
            icon: '⚠️',
            title: `${catInfo.name} Spike`,
            message: `${catInfo.name} spending is up ${change.toFixed(0)}% vs. last month (${formatCurrency(lastCatTotal, currency)} → ${formatCurrency(currentCatTotal, currency)}).`,
          });
        }
      }
    }
  }

  // 5) Anomaly detection — flag unusually large expenses
  if (expenses.length >= 5) {
    const amounts = expenses.map(e => e.amount);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((s, a) => s + Math.pow(a - avg, 2), 0) / amounts.length);

    const threshold = avg + 2 * stdDev;
    const recent = currentMonthExpenses.filter(e => e.amount > threshold);

    recent.forEach(e => {
      const catInfo = getCategoryById(e.category);
      insights.push({
        type: 'warning',
        icon: '🚨',
        title: 'Unusual Expense',
        message: `${e.description} (${formatCurrency(e.amount, currency)}) is significantly higher than your average expense of ${formatCurrency(avg, currency)}.`,
      });
    });
  }

  // 6) Streak / consistency
  if (currentMonthExpenses.length > 0) {
    const uniqueDays = new Set(currentMonthExpenses.map(e => e.date)).size;
    insights.push({
      type: 'info',
      icon: '📊',
      title: 'Tracking Streak',
      message: `You've tracked expenses on ${uniqueDays} day${uniqueDays !== 1 ? 's' : ''} this month across ${currentMonthExpenses.length} transaction${currentMonthExpenses.length !== 1 ? 's' : ''}.`,
    });
  }

  // 7) Tip if very few expenses
  if (expenses.length < 5) {
    insights.push({
      type: 'info',
      icon: '💡',
      title: 'Pro Tip',
      message: 'The more expenses you track, the smarter the AI insights become. Try to log every expense for accurate analysis!',
    });
  }

  return insights.slice(0, 6); // Cap at 6 insights
}

// ── Budget Recommendations ────────────────────────────────────────

export function getRecommendations(expenses, monthlyBudget, currency = 'USD') {
  if (!expenses || expenses.length < 5) return [];

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const currentMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  const currentTotal = sumBy(currentMonthExpenses, 'amount');
  const recommendations = [];

  // Budget adherence
  if (monthlyBudget > 0) {
    const pctUsed = (currentTotal / monthlyBudget) * 100;
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(thisYear, thisMonth + 1, 0).getDate();
    const pctMonth = (dayOfMonth / daysInMonth) * 100;

    if (pctUsed > pctMonth + 15) {
      const remaining = monthlyBudget - currentTotal;
      const daysLeft = daysInMonth - dayOfMonth;
      const dailyBudget = remaining > 0 ? remaining / daysLeft : 0;

      recommendations.push({
        icon: '💰',
        title: 'Budget Alert',
          message: remaining > 0
            ? `You've used ${pctUsed.toFixed(0)}% of your budget with ${daysLeft} days left. Try to spend no more than ${formatCurrency(dailyBudget, currency)}/day.`
            : `You've exceeded your monthly budget by ${formatCurrency(Math.abs(remaining), currency)}. Consider cutting back on non-essentials.`,
      });
    }
  }

  // Suggest cutting top non-essential category
  const byCategory = groupBy(currentMonthExpenses, 'category');
  const nonEssential = ['entertainment','shopping','food','travel','subscriptions'];

  let highestNonEssential = null;
  let highestAmount = 0;
  for (const cat of nonEssential) {
    if (byCategory[cat]) {
      const total = sumBy(byCategory[cat], 'amount');
      if (total > highestAmount) {
        highestNonEssential = cat;
        highestAmount = total;
      }
    }
  }

  if (highestNonEssential && highestAmount > currentTotal * 0.25) {
    const catInfo = getCategoryById(highestNonEssential);
    recommendations.push({
      icon: '✂️',
      title: 'Savings Opportunity',
      message: `${catInfo.name} makes up ${((highestAmount / currentTotal) * 100).toFixed(0)}% of your spending. Reducing it by 20% could save ${formatCurrency(highestAmount * 0.2, currency)}/month.`,
    });
  }

  return recommendations;
}

// ── Quick Stats ───────────────────────────────────────────────────

export function getQuickStats(expenses) {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const currentMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  const todayStr = toISODate(now);
  const todayExpenses = expenses.filter(e => e.date === todayStr);

  return {
    totalThisMonth: sumBy(currentMonthExpenses, 'amount'),
    totalToday: sumBy(todayExpenses, 'amount'),
    transactionCount: currentMonthExpenses.length,
    avgPerTransaction: currentMonthExpenses.length > 0
      ? sumBy(currentMonthExpenses, 'amount') / currentMonthExpenses.length
      : 0,
    topCategory: (() => {
      if (currentMonthExpenses.length === 0) return null;
      const byCategory = groupBy(currentMonthExpenses, 'category');
      let top = null, topAmt = 0;
      for (const [cat, exps] of Object.entries(byCategory)) {
        const t = sumBy(exps, 'amount');
        if (t > topAmt) { top = cat; topAmt = t; }
      }
      return top ? { ...getCategoryById(top), total: topAmt } : null;
    })(),
  };
}
