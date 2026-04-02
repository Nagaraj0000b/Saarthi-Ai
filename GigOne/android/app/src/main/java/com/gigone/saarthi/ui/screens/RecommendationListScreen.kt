package com.gigone.saarthi.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.gigone.saarthi.ui.theme.AppColors
import com.gigone.saarthi.util.getJobVisual


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecommendationListScreen(navController: NavController, vm: DashboardViewModel) {
    val recommendation by vm.recommendation.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.BgDeep)
            .statusBarsPadding()
    ) {
        TopAppBar(
            title = {
                Text(
                    "Best Job Assignments",
                    color = AppColors.TextPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            },
            navigationIcon = {
                IconButton(onClick = { navController.popBackStack() }) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = AppColors.TextPrimary)
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = AppColors.BgCard)
        )

        if (recommendation == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No recommendations currently available.", color = AppColors.TextSecondary)
            }
        } else {
            val jobs = recommendation!!.rankedJobs
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(jobs) { jobItem ->
                    val isTop = jobItem == jobs.first()
                    var border = if (isTop) AppColors.Primary else AppColors.BorderSubtle
                    var bgColor = if (isTop) AppColors.BgCard else AppColors.BgCard.copy(alpha = 0.6f)
                    
                    val visual = getJobVisual(jobItem.job)

                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = bgColor,
                        border = androidx.compose.foundation.BorderStroke(if (isTop) 2.dp else 1.dp, border),
                        modifier = Modifier.fillMaxWidth().clickable { navController.navigate("job_detail/${jobItem.job}") }
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(
                                    color = if (isTop) AppColors.Primary.copy(alpha = 0.15f) else AppColors.BgDeep,
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Icon(
                                        visual.icon,
                                        contentDescription = jobItem.job,
                                        tint = if (isTop) AppColors.Primary else AppColors.TextSecondary,
                                        modifier = Modifier.padding(8.dp).size(24.dp)
                                    )
                                }
                                Spacer(Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        jobItem.job,
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = AppColors.TextPrimary
                                    )
                                    if (!jobItem.jobType.isNullOrEmpty()) {
                                        Text(
                                            jobItem.jobType!!,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = AppColors.TextSecondary,
                                            modifier = Modifier.padding(top = 1.dp)
                                        )
                                    }
                                    if (isTop) {
                                        Text(
                                            "RECOMMENDED",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = AppColors.Primary,
                                            letterSpacing = 1.sp
                                        )
                                    } else if (jobItem.isCompatible == false) {
                                        Text(
                                            "Not Compatible (Vehicle)",
                                            fontSize = 11.sp,
                                            color = AppColors.Error
                                        )
                                    }
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        "₹${jobItem.finalScore.toInt()}",
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = AppColors.Accent
                                    )
                                    Text("/hr", fontSize = 10.sp, color = AppColors.TextSecondary)
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                            Text(
                                jobItem.reason,
                                fontSize = 12.sp,
                                color = AppColors.TextSecondary,
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
