/**
 * Build configuration for Emoty Kotlin Services
 * 
 * Mobile-optimized Kotlin services for pattern generation, emoji processing,
 * caching, and achievement systems. Designed for Android integration with
 * performance and battery efficiency as primary concerns.
 */

plugins {
    kotlin("jvm") version "1.9.24"
    kotlin("plugin.serialization") version "1.9.24"
    id("org.jetbrains.kotlinx.kover") version "0.7.6" // Code coverage
    id("org.jlleitschuh.gradle.ktlint") version "12.1.0" // Code formatting
    id("io.gitlab.arturbosch.detekt") version "1.23.6" // Static analysis
    id("org.jetbrains.dokka") version "1.9.10" // Documentation generation
    `maven-publish`
}

group = "com.emoty"
version = "1.0.0"

repositories {
    mavenCentral()
    google()
}

kotlin {
    jvmToolchain(17)
    
    compilerOptions {
        // Enable explicit API mode for better documentation
        explicitApi()
        
        // Optimization flags
        freeCompilerArgs.addAll(
            "-Xjsr305=strict", // Strict null safety with Java interop
            "-Xcontext-receivers", // Enable context receivers
            "-opt-in=kotlinx.coroutines.ExperimentalCoroutinesApi",
            "-opt-in=kotlin.ExperimentalStdlibApi"
        )
    }
}

dependencies {
    // Kotlin Coroutines - Core dependency for async operations
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    
    // Kotlin Serialization - For JSON handling
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
    
    // DateTime handling
    implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.5.0")
    
    // Collections - Immutable collections for performance
    implementation("org.jetbrains.kotlinx:kotlinx-collections-immutable:0.3.7")
    
    // Atomic operations for thread safety
    implementation("org.jetbrains.kotlinx:kotlinx-atomicfu:0.23.2")
    
    // Testing dependencies
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5:1.9.24")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")
    testImplementation("io.mockk:mockk:1.13.9")
    
    // Benchmarking for performance testing
    testImplementation("org.jetbrains.kotlinx:kotlinx-benchmark-runtime:0.4.10")
    
    // Optional Android dependencies (commented out for pure Kotlin module)
    // These can be uncommented when integrating with Android project
    /*
    compileOnly("androidx.room:room-runtime:2.6.1")
    compileOnly("androidx.room:room-ktx:2.6.1")
    compileOnly("androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0")
    compileOnly("androidx.lifecycle:lifecycle-livedata-ktx:2.7.0")
    compileOnly("com.google.dagger:hilt-android:2.48.1")
    */
}

tasks {
    // Test configuration
    test {
        useJUnitPlatform()
        
        // Performance test configuration
        systemProperty("junit.jupiter.execution.parallel.enabled", "true")
        systemProperty("junit.jupiter.execution.parallel.mode.default", "concurrent")
        
        // Memory settings for tests
        minHeapSize = "512m"
        maxHeapSize = "2048m"
        
        // Test reporting
        testLogging {
            events("passed", "skipped", "failed")
            showExceptions = true
            showCauses = true
            showStackTraces = true
        }
        
        // Fail fast on first test failure for quick feedback
        failFast = true
        
        // Generate test report
        finalizedBy(jacocoTestReport)
    }
    
    // Code coverage with Kover
    koverHtmlReport {
        dependsOn(test)
    }
    
    koverXmlReport {
        dependsOn(test)
    }
    
    // Code formatting with ktlint
    ktlintCheck {
        dependsOn(ktlintFormat)
    }
    
    // Static analysis with detekt
    detekt {
        dependsOn(ktlintCheck)
        parallel = true
        config.setFrom("$projectDir/detekt-config.yml")
        buildUponDefaultConfig = true
        allRules = false
        
        reports {
            html.required.set(true)
            xml.required.set(true)
            txt.required.set(false)
            sarif.required.set(false)
        }
    }
    
    // Documentation generation
    dokkaHtml {
        outputDirectory.set(layout.buildDirectory.dir("docs/kotlin"))
        
        dokkaSourceSets {
            configureEach {
                includeNonPublic.set(false)
                skipEmptyPackages.set(true)
                reportUndocumented.set(true)
                
                // Include samples in documentation
                samples.from("src/test/kotlin")
            }
        }
    }
    
    // Custom task for performance benchmarks
    register<Test>("benchmark") {
        group = "verification"
        description = "Runs performance benchmark tests"
        
        useJUnitPlatform {
            includeTags("benchmark")
        }
        
        // Dedicated settings for benchmarks
        minHeapSize = "1g"
        maxHeapSize = "4g"
        
        // JVM arguments for performance testing
        jvmArgs(
            "-XX:+UnlockExperimentalVMOptions",
            "-XX:+UseG1GC",
            "-XX:+UseStringDeduplication"
        )
        
        testLogging {
            events("passed", "failed")
            showStandardStreams = true
        }
    }
    
    // Custom task for memory profiling
    register<Test>("memoryProfile") {
        group = "verification"
        description = "Runs tests with memory profiling enabled"
        
        useJUnitPlatform {
            includeTags("memory")
        }
        
        jvmArgs(
            "-XX:+PrintGCDetails",
            "-XX:+PrintGCTimeStamps",
            "-Xloggc:build/gc.log"
        )
    }
    
    // Validation task that runs all quality checks
    register("validate") {
        group = "verification"
        description = "Runs all quality validation tasks"
        
        dependsOn(
            ktlintCheck,
            detekt,
            test,
            koverHtmlReport
        )
    }
    
    // Build task dependencies
    build {
        dependsOn(validate)
    }
    
    // Compilation settings
    compileKotlin {
        kotlinOptions {
            // Target JVM 17 for optimal performance
            jvmTarget = "17"
            
            // Enable all warnings as errors for strict quality
            allWarningsAsErrors = true
            
            // Optimization flags
            freeCompilerArgs += listOf(
                "-Xjsr305=strict",
                "-Xemit-jvm-type-annotations",
                "-Xno-optimized-callable-references",
                "-Xno-kotlin-nothing-value-exception"
            )
        }
    }
    
    compileTestKotlin {
        kotlinOptions {
            jvmTarget = "17"
            freeCompilerArgs += listOf(
                "-opt-in=kotlinx.coroutines.ExperimentalCoroutinesApi"
            )
        }
    }
}

// Code coverage configuration
kover {
    reports {
        total {
            html {
                onCheck = true
                title = "Emoty Kotlin Services Coverage"
            }
            
            xml {
                onCheck = true
            }
            
            verify {
                onCheck = true
                
                rule {
                    minBound(85) // Minimum 85% coverage
                }
                
                rule("Critical Services") {
                    includes = listOf("com.emoty.services.PatternGenerator", "com.emoty.services.EmojiProcessor")
                    minBound(90) // Higher coverage for critical services
                }
            }
        }
    }
}

// Ktlint configuration
ktlint {
    version.set("1.0.1")
    verbose.set(true)
    android.set(false)
    outputToConsole.set(true)
    outputColorName.set("RED")
    ignoreFailures.set(false)
    
    filter {
        exclude("**/build/**")
        exclude("**/generated/**")
    }
}

// Detekt configuration
detekt {
    toolVersion = "1.23.6"
    config.setFrom(files("$projectDir/detekt-config.yml"))
    parallel = true
    allRules = false
    buildUponDefaultConfig = true
    
    // Custom rule sets for mobile optimization
    dependencies {
        detektPlugins("io.gitlab.arturbosch.detekt:detekt-formatting:1.23.6")
    }
}

// Publishing configuration for potential library distribution
publishing {
    publications {
        create<MavenPublication>("maven") {
            from(components["kotlin"])
            
            pom {
                name.set("Emoty Kotlin Services")
                description.set("Mobile-optimized Kotlin services for emoji pattern generation and processing")
                url.set("https://github.com/emoty/emoty-web")
                
                licenses {
                    license {
                        name.set("MIT License")
                        url.set("https://opensource.org/licenses/MIT")
                    }
                }
                
                developers {
                    developer {
                        id.set("emoty-team")
                        name.set("Emoty Development Team")
                        email.set("dev@emoty.app")
                    }
                }
                
                scm {
                    connection.set("scm:git:git://github.com/emoty/emoty-web.git")
                    developerConnection.set("scm:git:ssh://github.com/emoty/emoty-web.git")
                    url.set("https://github.com/emoty/emoty-web")
                }
            }
        }
    }
}

// JVM test settings for optimal performance
tasks.withType<Test> {
    // Use parallel execution for faster test runs
    maxParallelForks = (Runtime.getRuntime().availableProcessors() / 2).coerceAtLeast(1)
    
    // Memory settings
    minHeapSize = "512m"
    maxHeapSize = "2048m"
    
    // JVM performance flags
    jvmArgs(
        "-XX:+UseG1GC",
        "-XX:MaxGCPauseMillis=200",
        "-XX:+UseStringDeduplication"
    )
}