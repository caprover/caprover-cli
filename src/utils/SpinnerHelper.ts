import ora = require('ora')

class SpinnerHelper {
    private spinner: any

    public start(message: string) {
        this.spinner = ora(message).start()
    }

    public setColor(color: string) {
        this.spinner.color = color
    }

    public stop() {
        this.spinner.stop()
    }

    public succeed() {
        this.spinner.succeed()
    }

    public fail() {
        this.spinner.fail()
    }
}

export default new SpinnerHelper()
