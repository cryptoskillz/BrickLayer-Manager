import re

with open('public/finance.html', 'r') as f:
    content = f.read()

# Update table headers
content = content.replace(
    '<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>',
    '<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>\\n                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>'
)

# Update table row
content = content.replace(
    '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" x-text="item.description"></td>',
    '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" x-text="item.description"></td>\\n                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize" :class="item.type === \\\'income\\\' ? \\\'text-green-600 font-medium\\\' : \\\'text-gray-500\\\'" x-text="item.type || \\\'expense\\\'"></td>'
)

# Update footer
footer_old = '''<tfoot class="bg-gray-50" x-show="filteredReport.length > 0">
                        <tr>
                            <td colspan="5" class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">Filtered Total Outstanding:</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 text-right" x-text="formatCurrency(filteredTotalUnpaid)"></td>
                        </tr>
                        <tr>
                            <td colspan="5" class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">Filtered Total Paid:</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right" x-text="formatCurrency(filteredTotalPaid)"></td>
                        </tr>
                        <tr class="border-t-2 border-gray-200">
                            <td colspan="5" class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right uppercase">Filtered Grand Total:</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right" x-text="formatCurrency(filteredTotalPaid + filteredTotalUnpaid)"></td>
                        </tr>
                    </tfoot>'''

footer_new = '''<tfoot class="bg-gray-50" x-show="filteredReport.length > 0">
                        <tr>
                            <td colspan="6" class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">Total Income:</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right" x-text="formatCurrency(totalIncome)"></td>
                        </tr>
                        <tr>
                            <td colspan="6" class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">Total Expenses:</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 text-right" x-text="formatCurrency(totalExpense)"></td>
                        </tr>
                        <tr class="border-t-2 border-gray-200">
                            <td colspan="6" class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right uppercase">Net Balance:</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-right" :class="netBalance >= 0 ? 'text-green-600' : 'text-red-600'" x-text="formatCurrency(netBalance)"></td>
                        </tr>
                    </tfoot>'''
content = content.replace(footer_old, footer_new)

# Update summary cards
cards_old = '''<div class="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                <div class="px-4 py-5 sm:p-6">
                    <dt class="text-sm font-medium text-gray-500 truncate">Total Outstanding</dt>
                    <dd class="mt-1 text-2xl font-semibold text-red-600" x-text="formatCurrency(globalTotalUnpaid)"></dd>
                </div>
            </div>
            <div class="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                <div class="px-4 py-5 sm:p-6">
                    <dt class="text-sm font-medium text-gray-500 truncate">Total Paid</dt>
                    <dd class="mt-1 text-2xl font-semibold text-green-600" x-text="formatCurrency(globalTotalPaid)"></dd>
                </div>
            </div>
            <div class="bg-white overflow-hidden shadow rounded-lg border border-gray-200 bg-blue-50">
                <div class="px-4 py-5 sm:p-6">
                    <dt class="text-sm font-medium text-blue-800 truncate">Monthly Run Rate</dt>
                    <dd class="mt-1 text-2xl font-semibold text-blue-900" x-text="formatCurrency(monthlyRunRate)"></dd>
                </div>
            </div>'''
cards_new = '''<div class="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                <div class="px-4 py-5 sm:p-6">
                    <dt class="text-sm font-medium text-gray-500 truncate">Total Income</dt>
                    <dd class="mt-1 text-2xl font-semibold text-green-600" x-text="formatCurrency(globalTotalIncome)"></dd>
                </div>
            </div>
            <div class="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
                <div class="px-4 py-5 sm:p-6">
                    <dt class="text-sm font-medium text-gray-500 truncate">Total Expenses</dt>
                    <dd class="mt-1 text-2xl font-semibold text-red-600" x-text="formatCurrency(globalTotalExpense)"></dd>
                </div>
            </div>
            <div class="bg-white overflow-hidden shadow rounded-lg border border-gray-200" :class="globalNetBalance >= 0 ? 'bg-green-50' : 'bg-red-50'">
                <div class="px-4 py-5 sm:p-6">
                    <dt class="text-sm font-medium truncate" :class="globalNetBalance >= 0 ? 'text-green-800' : 'text-red-800'">Net Balance</dt>
                    <dd class="mt-1 text-2xl font-semibold" :class="globalNetBalance >= 0 ? 'text-green-900' : 'text-red-900'" x-text="formatCurrency(globalNetBalance)"></dd>
                </div>
            </div>'''
content = content.replace(cards_old, cards_new)

# Update getters
getters_old = '''get globalTotalPaid() {
                return this.report.filter(i => i.is_paid).reduce((sum, item) => sum + item.amount, 0);
            },

            get globalTotalUnpaid() {
                return this.report.filter(i => !i.is_paid).reduce((sum, item) => sum + item.amount, 0);
            },

            get filteredTotalPaid() {
                return this.filteredReport.filter(i => i.is_paid).reduce((sum, item) => sum + item.amount, 0);
            },

            get filteredTotalUnpaid() {
                return this.filteredReport.filter(i => !i.is_paid).reduce((sum, item) => sum + item.amount, 0);
            },'''
getters_new = '''get globalTotalIncome() {
                return this.report.filter(i => i.type === 'income').reduce((sum, item) => sum + item.amount, 0);
            },
            get globalTotalExpense() {
                return this.report.filter(i => i.type !== 'income').reduce((sum, item) => sum + item.amount, 0);
            },
            get globalNetBalance() {
                return this.globalTotalIncome - this.globalTotalExpense;
            },
            get totalIncome() {
                return this.filteredReport.filter(i => i.type === 'income').reduce((sum, item) => sum + item.amount, 0);
            },
            get totalExpense() {
                return this.filteredReport.filter(i => i.type !== 'income').reduce((sum, item) => sum + item.amount, 0);
            },
            get netBalance() {
                return this.totalIncome - this.totalExpense;
            },'''
content = content.replace(getters_old, getters_new)

with open('public/finance.html', 'w') as f:
    f.write(content)
